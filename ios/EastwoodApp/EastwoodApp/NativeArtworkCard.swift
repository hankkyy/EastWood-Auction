import SwiftUI

struct NativeArtworkCard: View {
    @EnvironmentObject private var language: LanguageManager
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

            Text(artwork.displayTitle(in: language.language))
                .font(.headline)
                .lineLimit(2)

            HStack(spacing: 6) {
                metaChip((artwork.isOfficial ?? false) ? language.text("artwork.official") : language.text("artwork.user"), color: (artwork.isOfficial ?? false) ? .blue : .orange)
                metaChip(listingLabel(for: artwork), color: .purple)
                if artwork.caseRecord != nil {
                    metaChip(language.text("artwork.returnCase"), color: .green)
                }
                if artwork.isForSale == true {
                    metaChip(language.text("artwork.forSale"), color: .teal)
                } else {
                    metaChip(language.text("artwork.notForSale"), color: .secondary)
                }
            }

            HStack {
                Text(artwork.displayCategory(in: language.language))
                Spacer()
                Text(artwork.displayPeriod(in: language.language))
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            if artwork.isForSale == true {
                Text("\(artwork.currency ?? "USD") \(String(format: "%.0f", artwork.price ?? 0))")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.gold)
            }

            if let cid = artwork.collectionId, !cid.isEmpty {
                Text("\(language.text("artwork.id")): \(cid)")
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

    private func listingLabel(for artwork: NativeArtwork) -> String {
        if artwork.caseRecord != nil {
            return language.text("artwork.returnCase")
        }
        switch artwork.listingType {
        case "product":
            return language.text("artwork.product")
        case "collection":
            return language.text("artwork.collection")
        default:
            return artwork.listingType.capitalized
        }
    }
}

struct NativeArtworkListRow: View {
    @EnvironmentObject private var language: LanguageManager
    let artwork: NativeArtwork
    var embedded: Bool = false

    var body: some View {
        let thumb = EastwoodLayout.listThumbSize(for: UIScreen.main.bounds.width)
        let row = HStack(spacing: 10) {
            AsyncImage(url: artwork.imageURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .empty:
                    ZStack {
                        EastwoodTheme.panelSoft
                        ProgressView()
                    }
                case .failure:
                    ZStack {
                        EastwoodTheme.panelSoft
                        Image(systemName: "photo")
                            .foregroundStyle(.secondary)
                    }
                @unknown default:
                    EastwoodTheme.panelSoft
                }
            }
            .frame(width: thumb, height: thumb)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(artwork.displayTitle(in: language.language))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.ink)
                    .lineLimit(2)

                Text(detailLine)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                Text(secondaryLine)
                    .font(.caption2)
                    .foregroundStyle(EastwoodTheme.mutedText)
                    .lineLimit(1)
            }

            Spacer(minLength: 6)

            VStack(alignment: .trailing, spacing: 4) {
                Text(trailingTop)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.goldSoft)

                Text(trailingBottom)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }

        if embedded {
            row
                .padding(.bottom, 2)
        } else {
            row
                .padding(10)
                .eastwoodPanel()
        }
    }

    private var detailLine: String {
        if artwork.isForSale == true {
            return "\(artwork.currency ?? "USD") \(String(format: "%.0f", artwork.price ?? 0))"
        }
        return artwork.displayCategory(in: language.language)
    }

    private var secondaryLine: String {
        let source = (artwork.isOfficial ?? false) ? language.text("artwork.official") : language.text("artwork.community")
        return "\(source) • \(artwork.displayPeriod(in: language.language))"
    }

    private var trailingTop: String {
        if let caseRecord = artwork.caseRecord {
            return caseRecord.caseId
        }
        return artwork.listingType == "product" ? language.text("tab.shop") : language.text("artwork.view")
    }

    private var trailingBottom: String {
        if artwork.isForSale == true {
            return language.text("artwork.forSale")
        }
        if artwork.caseRecord != nil {
            return language.text("artwork.returnCase")
        }
        return listingLabel(for: artwork)
    }

    private func listingLabel(for artwork: NativeArtwork) -> String {
        if artwork.caseRecord != nil {
            return language.text("artwork.returnCase")
        }
        switch artwork.listingType {
        case "product":
            return language.text("artwork.product")
        case "collection":
            return language.text("artwork.collection")
        default:
            return artwork.listingType.capitalized
        }
    }
}
