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
            if let apiError = error as? APIClientError {
                errorMessage = apiError.localizedDescription
            } else if (error as NSError).domain == NSURLErrorDomain {
                errorMessage = AppErrorPresenter.text("error.offline")
            } else {
                errorMessage = String(format: AppErrorPresenter.text("error.server"),
                                      error.localizedDescription)
            }
        }
        isLoading = false
    }
}
