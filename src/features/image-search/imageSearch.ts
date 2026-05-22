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
const LOCAL_MATCH_MIN_SCORE = 72;
const LOCAL_MATCH_MIN_SIGNATURE_SCORE = 0.64;
const LOCAL_MATCH_MIN_SHAPE_AGREEMENT = 0.58;
const LOCAL_MATCH_MIN_BASE_SCORE = 0.52;
const LOCAL_MATCH_MIN_SIGNATURELESS_SCORE = 92;
const LOCAL_MATCH_MIN_TOP_GAP = 6;

const getSaturation = (red: number, green: number, blue: number) => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return max === 0 ? 0 : (max - min) / max;
};

const loadImageFromSource = (src: string, revokeOnLoad = false): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (revokeOnLoad) {
        URL.revokeObjectURL(src);
      }
      resolve(image);
    };
    image.onerror = () => {
      if (revokeOnLoad) {
        URL.revokeObjectURL(src);
      }
      reject(new Error("Unable to read the selected image."));
    };
    image.src = src;
  });

const loadImage = (file: File): Promise<HTMLImageElement> => {
  const previewUrl = URL.createObjectURL(file);
  return loadImageFromSource(previewUrl, true);
};

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

const vectorArraySimilarity = (left?: number[], right?: number[]) => {
  if (!left?.length || !right?.length) {
    return null;
  }

  const length = Math.min(left.length, right.length);
  let distance = 0;

  for (let index = 0; index < length; index += 1) {
    distance += Math.abs(left[index] - right[index]);
  }

  return clamp01(1 - distance / length);
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
    const weight = index <= 2 ? 0.3 : 1;

    return total + diff * diff * weight;
  }, 0);

  return clamp01(1 - Math.sqrt(distance) / 1.45);
};

const sampleBorderBackground = (pixels: Uint8ClampedArray, size: number) => {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (x > 1 && x < size - 2 && y > 1 && y < size - 2) {
        continue;
      }

      const index = (y * size + x) * 4;
      red += pixels[index] / 255;
      green += pixels[index + 1] / 255;
      blue += pixels[index + 2] / 255;
      count += 1;
    }
  }

  return {
    red: red / Math.max(1, count),
    green: green / Math.max(1, count),
    blue: blue / Math.max(1, count),
  };
};

const buildSignature = (
  pixels: Uint8ClampedArray,
  size: number
): ArtworkImageSignature => {
  const colorBins = new Array(48).fill(0);
  const edgeBins = new Array(16).fill(0);
  const orientationBins = new Array(8).fill(0);
  const luminanceGrid = new Array(64).fill(0);
  const rowProfile = new Array(16).fill(0);
  const columnProfile = new Array(16).fill(0);
  const grayValues: number[] = new Array(size * size).fill(0);
  const edgeMagnitudes: number[] = [];
  const background = sampleBorderBackground(pixels, size);
  let minX = size;
  let minY = size;
  let maxX = 0;
  let maxY = 0;
  let edgeCount = 0;
  let foregroundCount = 0;
  let centroidSumX = 0;
  let centroidSumY = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const red = pixels[index] / 255;
      const green = pixels[index + 1] / 255;
      const blue = pixels[index + 2] / 255;
      const gray = getGray(pixels, index);
      grayValues[y * size + x] = gray;

      const redBin = Math.min(15, Math.floor(red * 16));
      const greenBin = Math.min(15, Math.floor(green * 16));
      const blueBin = Math.min(15, Math.floor(blue * 16));
      colorBins[redBin] += 1;
      colorBins[16 + greenBin] += 1;
      colorBins[32 + blueBin] += 1;

      const gridX = Math.min(7, Math.floor((x / size) * 8));
      const gridY = Math.min(7, Math.floor((y / size) * 8));
      luminanceGrid[gridY * 8 + gridX] += gray;

      const colorDistance = Math.sqrt(
        (red - background.red) ** 2 +
        (green - background.green) ** 2 +
        (blue - background.blue) ** 2
      );
      const isForeground = colorDistance > 0.14 || Math.abs(gray - ((background.red + background.green + background.blue) / 3)) > 0.08;

      if (isForeground) {
        const profileX = Math.min(15, Math.floor((x / size) * 16));
        const profileY = Math.min(15, Math.floor((y / size) * 16));
        rowProfile[profileY] += 1;
        columnProfile[profileX] += 1;
        centroidSumX += x;
        centroidSumY += y;
        foregroundCount += 1;
      }
    }
  }

  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const grayLeft = grayValues[y * size + (x - 1)];
      const grayRight = grayValues[y * size + (x + 1)];
      const grayUp = grayValues[(y - 1) * size + x];
      const grayDown = grayValues[(y + 1) * size + x];
      const gradX = grayRight - grayLeft;
      const gradY = grayDown - grayUp;
      const magnitude = Math.sqrt(gradX ** 2 + gradY ** 2);

      edgeMagnitudes.push(magnitude);

      if (magnitude > 0.08) {
        const cellX = Math.min(3, Math.floor((x / size) * 4));
        const cellY = Math.min(3, Math.floor((y / size) * 4));
        edgeBins[cellY * 4 + cellX] += magnitude;

        const angle = (Math.atan2(gradY, gradX) + Math.PI) / (2 * Math.PI);
        const orientationBin = Math.min(7, Math.floor(angle * 8));
        orientationBins[orientationBin] += magnitude;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        edgeCount += 1;
      }
    }
  }

  const averageGray = grayValues.reduce((sum, value) => sum + value, 0) / grayValues.length;
  const averageHash = grayValues.map((value) => (value >= averageGray ? "1" : "0")).join("");

  const differenceHash: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      differenceHash.push(
        grayValues[y * size + x] > grayValues[y * size + x + 1] ? "1" : "0"
      );
    }
  }

  const cellSize = (size / 8) * (size / 8);
  const luminanceGridNormalized = luminanceGrid.map((value) => value / cellSize);
  const rowProfileNormalized = normalizeVector(rowProfile);
  const columnProfileNormalized = normalizeVector(columnProfile);
  const objectWidth = Math.max(1, maxX - minX + 1);
  const objectHeight = Math.max(1, maxY - minY + 1);
  const hasObjectBounds = edgeCount > 8;
  const texture = edgeMagnitudes.reduce((sum, value) => sum + value, 0) / Math.max(1, edgeMagnitudes.length);
  const foregroundRatio = foregroundCount / Math.max(1, size * size);
  const centroidX = foregroundCount ? centroidSumX / foregroundCount / size : 0.5;
  const centroidY = foregroundCount ? centroidSumY / foregroundCount / size : 0.5;

  return {
    colorHistogram: normalizeVector(colorBins),
    edgeHistogram: normalizeVector(edgeBins),
    averageHash,
    differenceHash: differenceHash.join(""),
    objectAspectRatio: hasObjectBounds ? objectWidth / objectHeight : 1,
    edgeDensity: edgeCount / Math.max(1, edgeMagnitudes.length),
    texture,
    luminanceGrid: luminanceGridNormalized,
    edgeOrientationHistogram: normalizeVector(orientationBins),
    rowProfile: rowProfileNormalized,
    columnProfile: columnProfileNormalized,
    foregroundRatio,
    centroidX,
    centroidY,
  };
};

const signatureSimilarity = (
  query: ArtworkImageSignature,
  candidate: ArtworkImageSignature
) => {
  const weightedScores: Array<{ score: number | null; weight: number }> = [
    { score: vectorArraySimilarity(query.rowProfile, candidate.rowProfile), weight: 0.18 },
    { score: vectorArraySimilarity(query.columnProfile, candidate.columnProfile), weight: 0.18 },
    { score: histogramSimilarity(query.edgeHistogram, candidate.edgeHistogram), weight: 0.12 },
    { score: vectorArraySimilarity(query.edgeOrientationHistogram, candidate.edgeOrientationHistogram), weight: 0.14 },
    { score: vectorArraySimilarity(query.luminanceGrid, candidate.luminanceGrid), weight: 0.1 },
    { score: hammingSimilarity(query.differenceHash, candidate.differenceHash), weight: 0.08 },
    { score: hammingSimilarity(query.averageHash, candidate.averageHash), weight: 0.08 },
    {
      score: numericSimilarity(
        Math.log(query.objectAspectRatio),
        Math.log(candidate.objectAspectRatio),
        0.9
      ),
      weight: 0.05,
    },
    {
      score:
        query.centroidX !== undefined &&
        query.centroidY !== undefined &&
        candidate.centroidX !== undefined &&
        candidate.centroidY !== undefined
          ? (
              numericSimilarity(query.centroidX, candidate.centroidX, 0.35) * 0.5 +
              numericSimilarity(query.centroidY, candidate.centroidY, 0.35) * 0.5
            )
          : null,
      weight: 0.05,
    },
    {
      score:
        query.foregroundRatio !== undefined && candidate.foregroundRatio !== undefined
          ? numericSimilarity(query.foregroundRatio, candidate.foregroundRatio, 0.35)
          : null,
      weight: 0.04,
    },
    {
      score: numericSimilarity(query.texture, candidate.texture, 0.22),
      weight: 0.03,
    },
    { score: histogramSimilarity(query.colorHistogram, candidate.colorHistogram), weight: 0.03 },
  ];

  let total = 0;
  let totalWeight = 0;
  for (const part of weightedScores) {
    if (part.score === null) {
      continue;
    }
    total += part.score * part.weight;
    totalWeight += part.weight;
  }

  const normalizedScore = totalWeight > 0 ? total / totalWeight : 0;
  const shapeCore = [
    vectorArraySimilarity(query.rowProfile, candidate.rowProfile),
    vectorArraySimilarity(query.columnProfile, candidate.columnProfile),
    numericSimilarity(
      Math.log(query.objectAspectRatio),
      Math.log(candidate.objectAspectRatio),
      0.9
    ),
  ].filter((value): value is number => value !== null);
  const shapeAgreement = shapeCore.length
    ? shapeCore.reduce((sum, value) => sum + value, 0) / shapeCore.length
    : normalizedScore;
  const shapeGate = 0.3 + shapeAgreement * 0.7;

  return {
    score: normalizedScore * shapeGate,
    shapeAgreement,
  };
};

export const readImageAsDataUrl = async (file: File): Promise<string> => {
  const image = await loadImage(file);
  const maxDimension = 1280;
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height)
  );
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to store the selected image.");
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const candidates = [0.82, 0.72, 0.6, 0.5];

  for (const quality of candidates) {
    const encoded = canvas.toDataURL("image/jpeg", quality);
    if (encoded.length <= 1_600_000 || quality === candidates[candidates.length - 1]) {
      return encoded;
    }
  }

  throw new Error("Unable to store the selected image.");
};

const buildImageFeature = (image: HTMLImageElement): ImageFeature => {
  const size = 48;
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

export const extractImageFeature = async (file: File): Promise<ImageFeature> => {
  const image = await loadImage(file);
  return buildImageFeature(image);
};

export const extractImageFeatureFromUrl = async (src: string): Promise<ImageFeature> => {
  const image = await loadImageFromSource(src);
  return buildImageFeature(image);
};

export const searchSimilarArtworks = (
  queryFeature: ImageFeature | ArtworkFeatureVector,
  collection: Artwork[]
): ImageSearchResult[] => {
  const queryVector = Array.isArray(queryFeature) ? queryFeature : queryFeature.vector;
  const querySignature = Array.isArray(queryFeature)
    ? null
    : queryFeature.signature ?? null;

  const rankedResults = collection
    .map((artwork) => {
      const baseScore = vectorSimilarity(queryVector, artwork.featureVector);
      const advanced =
        querySignature && artwork.imageSignature
          ? signatureSimilarity(querySignature, artwork.imageSignature)
          : null;

      let score = advanced === null ? baseScore * 58 : advanced.score * 94 + baseScore * 6;

      if (advanced && advanced.shapeAgreement < 0.38) {
        score = Math.min(score, 42);
      } else if (advanced && advanced.shapeAgreement < 0.5) {
        score = Math.min(score, 58);
      }

      const hasStrongSignatureMatch = advanced
        ? advanced.score >= LOCAL_MATCH_MIN_SIGNATURE_SCORE &&
          advanced.shapeAgreement >= LOCAL_MATCH_MIN_SHAPE_AGREEMENT &&
          baseScore >= LOCAL_MATCH_MIN_BASE_SCORE
        : false;
      const hasStrongVectorOnlyMatch =
        !advanced && baseScore * 100 >= LOCAL_MATCH_MIN_SIGNATURELESS_SCORE;

      return {
        artwork,
        score: Math.round(clampScore(score)),
        isEligible: hasStrongSignatureMatch || hasStrongVectorOnlyMatch,
      };
    })
    .filter((item) => item.isEligible)
    .sort((left, right) => right.score - left.score);

  if (!rankedResults.length) {
    return [];
  }

  const topResult = rankedResults[0];
  const secondResult = rankedResults[1];
  const topGap = secondResult ? topResult.score - secondResult.score : topResult.score;

  if (topResult.score < LOCAL_MATCH_MIN_SCORE) {
    return [];
  }

  if (secondResult && topGap < LOCAL_MATCH_MIN_TOP_GAP && topResult.score < 84) {
    return [];
  }

  return rankedResults.map(({ artwork, score }) => ({ artwork, score }));
};

export const getFeatureInsights = (
  vector: ArtworkFeatureVector
): FeatureInsight[] =>
  vector.map((value, index) => ({
    ...featureLabels[index],
    value: Math.round(value * 100),
  }));
