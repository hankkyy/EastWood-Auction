import type { Artwork, ArtworkFeatureVector } from "@/data/artworks";

export type ImageSearchResult = {
  artwork: Artwork;
  score: number;
};

export type ImageFeature = {
  vector: ArtworkFeatureVector;
  previewUrl: string;
};

export type FeatureInsight = {
  label: string;
  value: number;
  description: string;
};

const featureLabels: { label: string; description: string }[] = [
  {
    label: "Red",
    description: "Average red channel strength",
  },
  {
    label: "Green",
    description: "Average green channel strength",
  },
  {
    label: "Blue",
    description: "Average blue channel strength",
  },
  {
    label: "Brightness",
    description: "Overall image lightness",
  },
  {
    label: "Saturation",
    description: "Color intensity",
  },
  {
    label: "Warmth",
    description: "Red and gold leaning tone",
  },
  {
    label: "Coolness",
    description: "Blue and green leaning tone",
  },
  {
    label: "Contrast",
    description: "Light and dark variation",
  },
];

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const getSaturation = (red: number, green: number, blue: number) => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  if (max === 0) {
    return 0;
  }

  return (max - min) / max;
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
  const canvas = document.createElement("canvas");
  const size = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Image analysis is not supported in this browser.");
  }

  canvas.width = size;
  canvas.height = size;
  context.drawImage(image, 0, 0, size, size);

  const pixels = context.getImageData(0, 0, size, size).data;
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
  queryVector: ArtworkFeatureVector,
  collection: Artwork[]
): ImageSearchResult[] =>
  collection
    .map((artwork) => {
      const distance = artwork.featureVector.reduce((total, value, index) => {
        const diff = value - queryVector[index];
        const weight = index <= 2 ? 1.3 : 1;

        return total + diff * diff * weight;
      }, 0);

      return {
        artwork,
        score: Math.round(clampScore((1 - Math.sqrt(distance) / 1.8) * 100)),
      };
    })
    .sort((a, b) => b.score - a.score);

export const getFeatureInsights = (
  vector: ArtworkFeatureVector
): FeatureInsight[] =>
  vector.map((value, index) => ({
    ...featureLabels[index],
    value: Math.round(value * 100),
  }));
