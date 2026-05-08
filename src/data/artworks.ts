export type ArtworkFeatureVector = [
  red: number,
  green: number,
  blue: number,
  brightness: number,
  saturation: number,
  warmth: number,
  coolness: number,
  contrast: number
];

export type Artwork = {
  id: string;
  title: string;
  category: string;
  period: string;
  image: string;
  description: string;
  featureVector: ArtworkFeatureVector;
};

export const artworks: Artwork[] = [
  {
    id: "jade-pendant",
    title: "Qing Jade Pendant",
    category: "Jade",
    period: "Qing Dynasty",
    image:
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80",
    description:
      "A luminous green jade ornament selected for its translucent color and fine carved surface.",
    featureVector: [0.24, 0.68, 0.28, 0.52, 0.62, 0.28, 0.44, 0.38],
  },
  {
    id: "blue-white-porcelain",
    title: "Blue and White Porcelain Jar",
    category: "Porcelain",
    period: "Ming Style",
    image:
      "https://images.unsplash.com/photo-1578926288207-a90a5366759d?auto=format&fit=crop&w=900&q=80",
    description:
      "Porcelain with cobalt decoration, balanced by a bright ceramic ground and cool blue patterning.",
    featureVector: [0.68, 0.73, 0.88, 0.72, 0.36, 0.18, 0.78, 0.26],
  },
  {
    id: "bronze-ritual-vessel",
    title: "Bronze Ritual Vessel",
    category: "Bronze",
    period: "Archaic Revival",
    image:
      "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=900&q=80",
    description:
      "A dark bronze vessel with aged patina, dense relief details, and a warm metallic undertone.",
    featureVector: [0.42, 0.34, 0.25, 0.28, 0.31, 0.58, 0.16, 0.46],
  },
  {
    id: "ink-landscape",
    title: "Ink Landscape Scroll",
    category: "Painting",
    period: "Modern Ink",
    image:
      "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=900&q=80",
    description:
      "A restrained monochrome composition with misty tonal transitions and soft paper texture.",
    featureVector: [0.56, 0.55, 0.53, 0.55, 0.08, 0.24, 0.2, 0.34],
  },
  {
    id: "red-lacquer-box",
    title: "Carved Red Lacquer Box",
    category: "Lacquer",
    period: "Late Imperial",
    image:
      "https://images.unsplash.com/photo-1611308013843-a639168ef025?auto=format&fit=crop&w=900&q=80",
    description:
      "A red lacquer object with layered carving, polished highlights, and a deep warm surface.",
    featureVector: [0.72, 0.2, 0.14, 0.42, 0.68, 0.84, 0.08, 0.4],
  },
  {
    id: "gilt-figure",
    title: "Gilt Bronze Figure",
    category: "Sculpture",
    period: "Buddhist Art",
    image:
      "https://images.unsplash.com/photo-1608303588026-884930af2559?auto=format&fit=crop&w=900&q=80",
    description:
      "A gilded devotional figure whose reflective gold surface produces a bright, warm profile.",
    featureVector: [0.82, 0.62, 0.28, 0.66, 0.52, 0.78, 0.12, 0.36],
  },
];
