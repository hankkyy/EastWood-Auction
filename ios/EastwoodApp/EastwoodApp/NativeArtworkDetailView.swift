import SwiftUI

struct NativeArtworkDetailView: View {
    let artwork: NativeArtwork
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var favorites: FavoritesManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AsyncImage(url: artwork.imageURL) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFill()
                    case .empty: ZStack { Color.gray.opacity(0.2); ProgressView() }
                    case .failure: ZStack { Color.gray.opacity(0.2); Image(systemName: "photo") }
                    @unknown default: Color.gray.opacity(0.2)
                    }
                }
                .frame(height: 300)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(artwork.localizedTitle).font(.title2.weight(.bold))
                        HStack(spacing: 8) {
                            chip(artwork.category)
                            chip(artwork.period)
                            chip(artwork.listingType.capitalized)
                        }
                    }

                    Spacer()

                    Button {
                        guard auth.isAuthenticated else { return }
                        Task { await favorites.toggle(artworkId: artwork.id, token: auth.accessToken) }
                    } label: {
                        Image(systemName: favorites.favoriteIDs.contains(artwork.id) ? "heart.fill" : "heart")
                            .font(.title3)
                    }
                    .disabled(!auth.isAuthenticated)
                }

                if artwork.isForSale == true {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Price").font(.caption).foregroundStyle(.secondary)
                        Text("\(artwork.currency ?? "USD") \(String(format: "%.0f", artwork.price ?? 0))")
                            .font(.title3.weight(.semibold))
                    }
                    .padding(12)
                    .eastwoodPanel()
                }

                if let caseRecord = artwork.caseRecord {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Case Record").font(.headline)
                        infoRow("Case ID", caseRecord.caseId)
                        infoRow("Sale Price", caseRecord.salePrice)
                        infoRow("Sale Time", caseRecord.saleTime)
                        infoRow("Sale Platform", caseRecord.salePlatform)
                        infoRow("Client Region", caseRecord.clientRegion)
                    }
                    .padding(12)
                    .eastwoodPanel()
                }

                Text(artwork.description)
                    .font(.body)
            }
            .padding(16)
        }
        .navigationTitle("Detail")
        .navigationBarTitleDisplayMode(.inline)
        .background(EastwoodBackground())
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.white.opacity(0.12), in: Capsule())
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text(value)
        }
        .font(.subheadline)
    }
}
