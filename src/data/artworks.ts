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

export type ArtworkListingType = "product" | "collection";

export type ArtworkImageSignature = {
  colorHistogram: number[];
  edgeHistogram: number[];
  averageHash: string;
  differenceHash: string;
  objectAspectRatio: number;
  edgeDensity: number;
  texture: number;
};

export type Artwork = {
  id: string;
  title: string;
  titleZh?: string;
  category: string;
  categoryZh?: string;
  period: string;
  periodZh?: string;
  image: string;
  description: string;
  descriptionZh?: string;
  listingType: ArtworkListingType;
  featureVector: ArtworkFeatureVector;
  imageSignature?: ArtworkImageSignature;
};

export const artworks: Artwork[] = [
  {
    id: "qing-blue-glaze-vase",
    title: "Qing Blue Glazed Porcelain Vase",
    titleZh: "清 蓝釉瓷瓶",
    category: "Porcelain Vase",
    categoryZh: "瓷器花瓶",
    period: "Qing Dynasty, 18th century",
    periodZh: "清代，18 世纪",
    listingType: "product",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/42216/1782226/main-image",
    description:
      "A small Qing porcelain vase with a deep blue glaze and compact rounded form, suitable for matching blue ceramic vase references.",
    descriptionZh:
      "一件清代蓝釉瓷瓶，器形小巧圆润，适合匹配蓝色瓷瓶、古董花瓶一类参考图片。",
    featureVector: [0.42, 0.5, 0.72, 0.55, 0.42, 0.18, 0.68, 0.3],
  },
  {
    id: "qing-nine-peaches-vase",
    title: "Qing Porcelain Vase with Nine Peaches",
    titleZh: "清 粉彩九桃瓷瓶",
    category: "Porcelain Vase",
    categoryZh: "瓷器花瓶",
    period: "Qing Dynasty",
    periodZh: "清代",
    listingType: "product",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/42317/preview",
    description:
      "A tall Chinese porcelain vase decorated with peach motifs and soft famille-rose colors, useful for matching floral antique vase photos.",
    descriptionZh:
      "一件带有桃纹装饰的清代粉彩瓷瓶，适合匹配花卉纹饰、彩瓷和古董花瓶照片。",
    featureVector: [0.72, 0.58, 0.5, 0.62, 0.44, 0.58, 0.24, 0.32],
  },
  {
    id: "qing-bottle-vase",
    title: "Qing Bottle Vase",
    titleZh: "清 长颈瓶",
    category: "Porcelain Vase",
    categoryZh: "瓷器花瓶",
    period: "Qing Dynasty",
    periodZh: "清代",
    listingType: "product",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/51041/preview",
    description:
      "A slender antique bottle vase with a narrow neck and balanced ceramic silhouette, intended for matching vase-shaped uploads.",
    descriptionZh:
      "一件细长颈古董瓶，轮廓清晰，适合匹配长颈瓶、赏瓶和相近器形的上传图片。",
    featureVector: [0.62, 0.58, 0.52, 0.58, 0.24, 0.42, 0.28, 0.28],
  },
  {
    id: "cui-zifan-lotus-scroll",
    title: "Cui Zifan Lotus Hanging Scroll",
    titleZh: "崔子范 荷花立轴",
    category: "Chinese Painting",
    categoryZh: "中国字画",
    period: "20th century",
    periodZh: "20 世纪",
    listingType: "product",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/36413/2224688/thumbnail",
    description:
      "A Chinese lotus painting in ink and color on paper, selected as a reference for matching flower, ink, and hanging-scroll images.",
    descriptionZh:
      "一幅纸本设色荷花立轴，适合匹配花鸟画、水墨字画和卷轴类参考图片。",
    featureVector: [0.58, 0.56, 0.52, 0.55, 0.16, 0.3, 0.24, 0.36],
  },
  {
    id: "xiao-zhunxian-ink-lotus",
    title: "Xiao Zhunxian Ink Lotus Painting",
    titleZh: "萧俊贤 水墨荷花图",
    category: "Chinese Painting",
    categoryZh: "中国字画",
    period: "Dated 1932",
    periodZh: "1932 年作",
    listingType: "product",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/36248/preview",
    description:
      "A monochrome ink lotus hanging scroll with bold brushwork and gray tonal variation, useful for matching black-and-white Chinese paintings.",
    descriptionZh:
      "一幅水墨荷花立轴，笔墨层次明显，适合匹配黑白水墨画、荷花题材和传统字画。",
    featureVector: [0.5, 0.49, 0.47, 0.49, 0.08, 0.2, 0.18, 0.42],
  },
  {
    id: "qing-jade-pendant",
    title: "Qing Jade Pendant",
    titleZh: "清 玉佩",
    category: "Jade",
    categoryZh: "玉器",
    period: "Qing Dynasty, 18th-19th century",
    periodZh: "清代，18 至 19 世纪",
    listingType: "collection",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/43932/1742061/main-image",
    description:
      "A pale nephrite jade pendant with carved surface detail, suitable for representing the house collection and jade expertise.",
    descriptionZh:
      "一件浅色玉佩，带有雕刻细节，用作展示型藏品，体现玉器收藏和鉴赏方向。",
    featureVector: [0.46, 0.64, 0.48, 0.53, 0.28, 0.22, 0.48, 0.34],
  },
  {
    id: "carved-jade-brush-washer",
    title: "Carved Jade Brush Washer",
    titleZh: "雕玉笔洗",
    category: "Jade",
    categoryZh: "玉器",
    period: "Qing Dynasty",
    periodZh: "清代",
    listingType: "collection",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/42060/preview",
    description:
      "A dark green carved jade vessel with dense relief decoration, included as a display collection item rather than a sale listing.",
    descriptionZh:
      "一件深绿色雕玉文房器，纹饰细密，作为展示型藏品，不进入用户可售商品匹配。",
    featureVector: [0.28, 0.45, 0.34, 0.34, 0.38, 0.18, 0.42, 0.5],
  },
  {
    id: "shang-bronze-wine-container",
    title: "Shang Bronze Wine Container",
    titleZh: "商 青铜酒器",
    category: "Bronze",
    categoryZh: "铜器",
    period: "Shang Dynasty, 13th century BCE",
    periodZh: "商代，公元前 13 世纪",
    listingType: "collection",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/52617/150063/main-image",
    description:
      "A large archaic bronze wine vessel with dark patina and raised surface patterns, included as a display collection reference.",
    descriptionZh:
      "一件大型高古青铜酒器，包浆深沉、纹饰突出，用作展示型藏品参考。",
    featureVector: [0.34, 0.34, 0.32, 0.33, 0.12, 0.34, 0.22, 0.48],
  },
  {
    id: "ming-gilt-bronze-ding",
    title: "Ming Gilt Bronze Tripod Censer",
    titleZh: "明 铜鎏金三足炉",
    category: "Bronze",
    categoryZh: "铜器",
    period: "Ming Dynasty, 17th century",
    periodZh: "明代，17 世纪",
    listingType: "collection",
    image:
      "https://collectionapi.metmuseum.org/api/collection/v1/iiif/823596/1925259/main-image",
    description:
      "A parcel-gilt tripod censer with warm gold tones and archaistic decoration, used to show bronze and incense-burner collecting strength.",
    descriptionZh:
      "一件铜鎏金三足炉，色泽温润、带仿古纹饰，用于展示铜器和香炉类收藏实力。",
    featureVector: [0.72, 0.56, 0.28, 0.52, 0.5, 0.78, 0.12, 0.44],
  },
];
