import Foundation

protocol NativeArtworkServiceProtocol {
    func fetchArtworks() async throws -> [NativeArtwork]
}

struct NativeArtworkService: NativeArtworkServiceProtocol {
    func fetchArtworks() async throws -> [NativeArtwork] {
        guard let api = NativeAPIClient() else { throw APIClientError.badURL }
        let data = try await api.requestJSON(path: "api/artworks", retries: 2)
        let decoded = try JSONDecoder().decode(NativeArtworkResponse.self, from: data)
        return decoded.artworks
    }
}
