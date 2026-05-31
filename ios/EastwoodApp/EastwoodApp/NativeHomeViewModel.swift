import Foundation

@MainActor
final class NativeHomeViewModel: ObservableObject {
    @Published var artworks: [NativeArtwork] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service: NativeArtworkServiceProtocol

    init(service: NativeArtworkServiceProtocol = NativeArtworkService()) {
        self.service = service
    }

    func load() async {
        if isLoading { return }
        isLoading = true
        errorMessage = nil
        do {
            let all = try await service.fetchArtworks()
            artworks = all
        } catch {
            errorMessage = "加载失败，请稍后重试"
        }
        isLoading = false
    }
}
