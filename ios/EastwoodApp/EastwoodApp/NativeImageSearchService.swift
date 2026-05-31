import Foundation
import UIKit

struct NativeImageMatch: Decodable, Identifiable {
    struct MatchArtwork: Decodable {
        let id: String
        let title: String
        let titleZh: String?
        let category: String
        let period: String
        let image: String
        let description: String
        let galleryImages: [String]?
        let listingType: String?
        let featureVector: [Double]?
        let isForSale: Bool?
        let price: Double?
        let currency: String?
        let caseRecord: NativeCaseRecord?
        let collectionId: String?
    }

    let artwork: MatchArtwork
    let similarity: Double
    var id: String { artwork.id }
}

struct NativeImageMatchResponse: Decodable {
    let imageUrl: String?
    let threshold: Double?
    let matches: [NativeImageMatch]
    let error: String?
}

@MainActor
final class NativeImageSearchService: ObservableObject {
    @Published var isSearching = false
    @Published var matches: [NativeImageMatch] = []
    @Published var errorMessage: String?
    @Published var lastThreshold: Double = 0.6
    @Published var uploadedImageURL: String?
    @Published var totalCandidates: Int = 0
    @Published var knowledgeTotal: Int = 0
    @Published var knowledgeProducts: Int = 0
    @Published var knowledgeCollections: Int = 0
    @Published var knowledgeCases: Int = 0

    private var hasLoadedStats = false

    func refreshKnowledgeStats() async {
        guard let base = AppConfig.webAppURL else { return }
        try? await loadKnowledgeStats(base: base)
        hasLoadedStats = true
    }

    func runSearch(image: UIImage, threshold: Double, matchCount: Int) async {
        guard let base = AppConfig.webAppURL else { return }
        guard let jpeg = image.jpegData(compressionQuality: 0.85) else {
            errorMessage = "Invalid image"
            return
        }

        let dataUrl = "data:image/jpeg;base64,\(jpeg.base64EncodedString())"

        isSearching = true
        errorMessage = nil
        defer { isSearching = false }

        do {
            if !hasLoadedStats {
                try? await loadKnowledgeStats(base: base)
                hasLoadedStats = true
            }

            var uploadReq = URLRequest(url: base.appendingPathComponent("api/image-search/upload"))
            uploadReq.httpMethod = "POST"
            uploadReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
            uploadReq.httpBody = try JSONSerialization.data(withJSONObject: [
                "imageDataUrl": dataUrl,
                "fileName": "ios-query.jpg"
            ])

            let (uploadData, uploadResp) = try await URLSession.shared.data(for: uploadReq)
            guard let uploadHTTP = uploadResp as? HTTPURLResponse, (200...299).contains(uploadHTTP.statusCode) else {
                throw URLError(.badServerResponse)
            }

            let uploadJson = try JSONSerialization.jsonObject(with: uploadData) as? [String: Any]
            guard let imageUrl = uploadJson?["imageUrl"] as? String else {
                throw URLError(.cannotParseResponse)
            }
            uploadedImageURL = imageUrl

            var matchReq = URLRequest(url: base.appendingPathComponent("api/image-search/match"))
            matchReq.httpMethod = "POST"
            matchReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
            matchReq.httpBody = try JSONSerialization.data(withJSONObject: [
                "imageUrl": imageUrl,
                "threshold": threshold,
                "matchCount": matchCount,
            ])

            let (matchData, matchResp) = try await URLSession.shared.data(for: matchReq)
            guard let matchHTTP = matchResp as? HTTPURLResponse else {
                throw URLError(.badServerResponse)
            }
            if !(200...299).contains(matchHTTP.statusCode) {
                if let payload = try? JSONSerialization.jsonObject(with: matchData) as? [String: Any],
                   let message = payload["error"] as? String,
                   !message.isEmpty {
                    throw APIClientError.server(message)
                }
                throw URLError(.badServerResponse)
            }

            let decoded = try JSONDecoder().decode(NativeImageMatchResponse.self, from: matchData)
            matches = decoded.matches
            lastThreshold = decoded.threshold ?? threshold
            totalCandidates = decoded.matches.count
        } catch {
            errorMessage = error.localizedDescription == "The operation couldn’t be completed. (NSURLErrorDomain error -1011.)"
            ? "Image search failed."
            : error.localizedDescription
            matches = []
        }
    }

    private func loadKnowledgeStats(base: URL) async throws {
        let (data, response) = try await URLSession.shared.data(from: base.appendingPathComponent("api/artworks"))
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return }
        let decoded = try JSONDecoder().decode(NativeArtworkResponse.self, from: data)
        let all = decoded.artworks
        knowledgeTotal = all.count
        knowledgeProducts = all.filter { $0.listingType == "product" || $0.isForSale == true }.count
        knowledgeCollections = all.filter { $0.listingType == "collection" }.count
        knowledgeCases = all.filter { $0.caseRecord != nil }.count
    }
}
