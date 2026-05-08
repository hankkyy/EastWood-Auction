import type {
  Artwork,
  ArtworkFeatureVector,
  ArtworkImageSignature,
} from "@/data/artworks";

export type ImageSearchResult = {
  artwork: Artwork;
  score: number;
};

export type ImageFeature = {
  vector: ArtworkFeatureVector;
  previewUrl: string;
  signature?: ArtworkImageSignature;
};

export type FeatureInsight = {
  label: string;
  value: number;
  description: string;
};

const featureLabels: { label: string; description: string }[] = [
  { label: "Red", description: "Average red channel strength" },
  { label: "Green", description: "Average green channel strength" },
  { label: "Blue", description: "Average blue channel strength" },
  { label: "Brightness", description: "Overall image lightness" },
  { label: "Saturation", description: "Color intensity" },
  { label: "Warmth", description: "Red and gold leaning tone" },
  { label: "Coolness", description: "Blue and green leaning tone" },
  { label: "Contrast", description: "Light and dark variation" },
];

const clampScore = (value: number) => Math.max(0, Math.min(100, value));
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getSaturation = (red: number, green: number, blue: number) => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return max === 0 ? 0 : (max - min) / max;
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const previewUrl = URL.createObjectURL(file);

    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("Unable to read the selected image."));
    };
    image.src = previewUrl;
  });

const getPixels = (image: HTMLImageElement, size: number) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Image analysis is not supported in this browser.");
  }

  canvas.width = size;
  canvas.height = size;
  context.drawImage(image, 0, 0, size, size);

  return context.getImageData(0, 0, size, size).data;
};

const getGray = (pixels: Uint8ClampedArray, index: number) =>
  (pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114) /
  255;

const normalizeVector = (values: number[]) => {
  const total = values.reduce((sum, value) => sum + value, 0);
  return total > 0 ? values.map((value) => value / total) : values;
};

const histogramSimilarity = (left: number[], right: number[]) => {
  const length = Math.min(left.length, right.length);
  let intersection = 0;

  for (let index = 0; index < length; index += 1) {
    intersection += Math.min(left[index], right[index]);
  }

  return clamp01(intersection);
};

const hammingSimilarity = (left: string, right: string) => {
  const length = Math.min(left.length, right.length);

  if (!length) {
    return 0;
  }

  let different = 0;
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) {
      different += 1;
    }
  }

  return 1 - different / length;
};

const numericSimilarity = (left: number, right: number, tolerance: number) =>
  clamp01(1 - Math.abs(left - right) / tolerance);

const vectorSimilarity = (
  left: ArtworkFeatureVector,
  right: ArtworkFeatureVector
) => {
  const distance = left.reduce((total, value, index) => {
    const diff = value - right[index];
    const weight = index <= 2 ? 0.45 : 1;

    return total + diff * diff * weight;
  }, 0);

  return clamp01(1 - Math.sqrt(distance) / 1.5);
};

const buildSignature = (
  pixels: Uint8ClampedArray,
  size: number
): ArtworkImageSignature => {
  const colorBins = new Array(48).fill(0);
  const edgeBins = new Array(16).fill(0);
  const grayValues: number[] = [];
  const edgeMagnitudes: number[] = [];
  let minX = size;
  let minY = size;
  let maxX = 0;
  let maxY = 0;
  let edgeCount = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const red = pixels[index] / 255;
      const green = pixels[index + 1] / 255;
      const blue = pixels[index + 2] / 255;
      const gray = getGray(pixels, index);
      grayValues.push(gray);

      const redBin = Math.min(15, Math.floor(red * 16));
      const greenBin = Math.min(15, Math.floor(green * 16));
      const blueBin = Math.min(15, Math.floor(blue * 16));
      colorBins[redBin] += 1;
      colorBins[16 + greenBin] += 1;
      colorBins[32 + blueBin] += 1;

      if (x > 0 && y > 0 && x < size - 1 && y < size - 1) {
        const left = grayValues[y * size + x - 1] ?? gray;
        const up = grayValues[(y - 1) * size + x] ?? gray;
        const magnitude = Math.abs(gray - left) + Math.abs(gray - up);
        edgeMagnitudes.push(magnitude);

        if (magnitude > 0.12) {
          const cellX = Math.min(3, Math.floor((x / size) * 4));
          const cellY = Math.min(3, Math.floor((y / size) * 4));
          edgeBins[cellY * 4 + cellX] += magnitude;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          edgeCount += 1;
        }
      }
    }
  }

  const averageGray = grayValues.reduce((sum, value) => sum + value, 0) / grayValues.length;
  const averageHash = grayValues
    .map((value) => (value >= averageGray ? "1" : "0"))
    .join("");

  const differenceHash: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      differenceHash.push(
        grayValues[y * size + x] > grayValues[y * size + x + 1] ? "1" : "0"
      );
    }
  }

  const objectWidth = Math.max(1, maxX - minX + 1);
  const objectHeight = Math.max(1, maxY - minY + 1);
  const hasObjectBounds = edgeCount > 8;
  const texture =
    edgeMagnitudes.reduce((sum, value) => sum + value, 0) /
    Math.max(1, edgeMagnitudes.length);

  return {
    colorHistogram: normalizeVector(colorBins),
    edgeHistogram: normalizeVector(edgeBins),
    averageHash,
    differenceHash: differenceHash.join(""),
    objectAspectRatio: hasObjectBounds ? objectWidth / objectHeight : 1,
    edgeDensity: edgeCount / Math.max(1, edgeMagnitudes.length),
    texture,
  };
};

const signatureSimilarity = (
  query: ArtworkImageSignature,
  candidate: ArtworkImageSignature
) => {
  const color = histogramSimilarity(query.colorHistogram, candidate.colorHistogram);
  const edge = histogramSimilarity(query.edgeHistogram, candidate.edgeHistogram);
  const averageHash = hammingSimilarity(query.averageHash, candidate.averageHash);
  const differenceHash = hammingSimilarity(query.differenceHash, candidate.differenceHash);
  const aspect = numericSimilarity(
    Math.log(query.objectAspectRatio),
    Math.log(candidate.objectAspectRatio),
    1.05
  );
  const density = numericSimilarity(query.edgeDensity, candidate.edgeDensity, 0.45);
  const texture = numericSimilarity(query.texture, candidate.texture, 0.28);

  return (
    edge * 0.28 +
    differenceHash * 0.22 +
    averageHash * 0.16 +
    aspect * 0.12 +
    density * 0.08 +
    texture * 0.08 +
    color * 0.06
  );
};

export const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to store the selected image."));
    };
    reader.onerror = () => reject(new Error("Unable to store the selected image."));
    reader.readAsDataURL(file);
  });

export const extractImageFeature = async (file: File): Promise<ImageFeature> => {
  const image = await loadImage(file);
  const size = 32;
  const pixels = getPixels(image, size);
  let red = 0;
  let green = 0;
  let blue = 0;
  let saturation = 0;
  let contrast = 0;
  const brightnessValues: number[] = [];
  const pixelCount = pixels.length / 4;

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index] / 255;
    const g = pixels[index + 1] / 255;
    const b = pixels[index + 2] / 255;
    const brightness = (r + g + b) / 3;

    red += r;
    green += g;
    blue += b;
    saturation += getSaturation(r, g, b);
    brightnessValues.push(brightness);
  }

  red /= pixelCount;
  green /= pixelCount;
  blue /= pixelCount;
  saturation /= pixelCount;

  const brightness = (red + green + blue) / 3;
  for (const value of brightnessValues) {
    contrast += Math.abs(value - brightness);
  }
  contrast /= brightnessValues.length;

  const warmth = Math.max(0, red * 0.7 + green * 0.3 - blue * 0.35);
  const coolness = Math.max(0, blue * 0.65 + green * 0.35 - red * 0.3);

  return {
    previewUrl: image.src,
    signature: buildSignature(pixels, size),
    vector: [
      red,
      green,
      blue,
      brightness,
      saturation,
      warmth,
      coolness,
      contrast,
    ],
  };
};

export const searchSimilarArtworks = (
  queryFeature: ImageFeature | ArtworkFeatureVector,
  collection: Artwork[]
): ImageSearchResult[] => {
  const queryVector = Array.isArray(queryFeature) ? queryFeature : queryFeature.vector;
  const querySignature = Array.isArray(queryFeature)
    ? null
    : queryFeature.signature ?? null;

  return collection
    .map((artwork) => {
      const legacyScore = vectorSimilarity(queryVector, artwork.featureVector);
      const advancedScore =
        querySignature && artwork.imageSignature
          ? signatureSimilarity(querySignature, artwork.imageSignature)
          : null;
      const score = advancedScore === null
        ? Math.min(legacyScore * 100, 62)
        : advancedScore * 88 + legacyScore * 12;

      return {
        artwork,
        score: Math.round(clampScore(score)),
      };
    })
    .sort((a, b) => b.score - a.score);
};

export const getFeatureInsights = (
  vector: ArtworkFeatureVector
): FeatureInsight[] =>
  vector.map((value, index) => ({
    ...featureLabels[index],
    value: Math.round(value * 100),
  }));
