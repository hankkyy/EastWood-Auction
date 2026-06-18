import Foundation

struct Native3DModel: Decodable, Hashable {
    let url: String
    let format: String            // "usdz" or "glb"
    let thumbnailUrl: String
    let posterUrl: String
    let fileSize: Int
    let vertexCount: Int?
    let faceCount: Int?
    let scanDate: String?
}

struct NativeArtwork: Identifiable, Decodable, Hashable {
    let id: String
    let title: String
    let titleZh: String?
    let descriptionZh: String?
    let category: String
    let categoryZh: String?
    let period: String
    let periodZh: String?
    let image: String
    let galleryImages: [String]?
    let description: String
    let listingType: String
    let featureVector: [Double]
    let isForSale: Bool?
    let price: Double?
    let currency: String?
    let caseRecord: NativeCaseRecord?
    let collectionId: String?
    let uploadedBy: String?
    let isOfficial: Bool?
    let threeDModel: Native3DModel?

    var localizedTitle: String {
        let zh = titleZh?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return zh.isEmpty ? title : zh
    }

    var imageURL: URL? {
        URL(string: image)
    }
}

struct NativeCaseRecord: Decodable, Hashable {
    let caseId: String
    let salePrice: String
    let saleTime: String
    let salePlatform: String
    let clientRegion: String
    let logisticsCost: String
    let purchaseChannel: String
    let purchaseCost: String
    let riskAdvice: String
}

struct NativeArtworkResponse: Decodable {
    let artworks: [NativeArtwork]
}
