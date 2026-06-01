import SwiftUI

struct NativeArtworkCard: View {
    let artwork: NativeArtwork

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            AsyncImage(url: artwork.imageURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .empty:
                    ZStack {
                        Color.gray.opacity(0.2)
                        ProgressView()
                    }
                case .failure:
                    ZStack {
                        Color.gray.opacity(0.2)
                        Image(systemName: "photo")
                            .font(.title2)
                            .foregroundStyle(.secondary)
                    }
                @unknown default:
                    Color.gray.opacity(0.2)
                }
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(4.0 / 3.0, contentMode: .fit)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            Text(artwork.localizedTitle)
                .font(.headline)
                .lineLimit(2)

            HStack(spacing: 6) {
                metaChip((artwork.isOfficial ?? false) ? "Official" : "User", color: (artwork.isOfficial ?? false) ? .blue : .orange)
                metaChip(artwork.listingType.capitalized, color: .purple)
                if artwork.caseRecord != nil {
                    metaChip("Case", color: .green)
                }
                if artwork.isForSale == true {
                    metaChip("For Sale", color: .teal)
                } else {
                    metaChip("Not For Sale", color: .secondary)
                }
            }

            HStack {
                Text(artwork.category)
                Spacer()
                Text(artwork.period)
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            if artwork.isForSale == true {
                Text("\(artwork.currency ?? "USD") \(String(format: "%.0f", artwork.price ?? 0))")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.goldSoft)
            }

            if let cid = artwork.collectionId, !cid.isEmpty {
                Text("ID: \(cid)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
        }
        .padding(12)
        .eastwoodPanel()
    }

    private func metaChip(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(color.opacity(0.18), in: Capsule())
            .foregroundStyle(color)
    }
}
