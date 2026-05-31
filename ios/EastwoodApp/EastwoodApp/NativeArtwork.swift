import Foundation

struct NativeArtwork: Identifiable, Decodable, Hashable {
    let id: String
    let title: String
    let titleZh: String?
    let category: String
    let period: String
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
