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
  luminanceGrid?: number[];
  edgeOrientationHistogram?: number[];
  rowProfile?: number[];
  columnProfile?: number[];
  foregroundRatio?: number;
  centroidX?: number;
  centroidY?: number;
};


export type ArtworkCaseRecord = {
  caseId: string;
  salePrice: string;
  saleTime: string;
  salePlatform: string;
  clientRegion: string;
  logisticsCost: string;
  purchaseChannel: string;
  purchaseCost: string;
  riskAdvice: string;
};

export type ThreeDModel = {
  url: string;            // USDZ/GLB 模型文件 URL
  format: 'usdz' | 'glb'; // 模型格式
  thumbnailUrl: string;   // 3D 预览缩略图
  posterUrl: string;      // 封面视角图
  fileSize: number;       // 文件大小 (bytes)
  vertexCount?: number;   // 顶点数
  faceCount?: number;     // 面数
  scanDate?: string;      // 扫描日期 (ISO 8601)
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
  galleryImages?: string[];
  description: string;
  descriptionZh?: string;
  listingType: ArtworkListingType;
  featureVector: ArtworkFeatureVector;
  imageEmbedding?: number[];
  imageSignature?: ArtworkImageSignature;
  caseRecord?: ArtworkCaseRecord;
  uploadedBy?: string; // 上传者用户ID (UUID)
  uploaderName?: string; // 上传者显示名称 (user_id)
  isForSale?: boolean; // 是否可售
  price?: number; // 售价
  currency?: 'USD' | 'CNY'; // 货币单位
  collectionId?: string; // 藏品编号（唯一标识）
  isOfficial?: boolean; // 是否为平台上传（管理员上传）
  threeDModel?: ThreeDModel; // LiDAR 3D 扫描模型
};

export const artworks: Artwork[] = [];
