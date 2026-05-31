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
            .frame(height: 200)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            Text(artwork.localizedTitle)
                .font(.headline)
                .lineLimit(2)

            HStack {
                Text(artwork.category)
                Spacer()
                Text(artwork.period)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(12)
        .eastwoodPanel()
    }
}
