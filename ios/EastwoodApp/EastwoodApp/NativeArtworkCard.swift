import SwiftUI

struct NativeArtworkCard: View {
    @EnvironmentObject private var language: LanguageManager
    let artwork: NativeArtwork

    private var cardTint: Color {
        if artwork.caseRecord != nil {
            return EastwoodTheme.sage
        }
        if artwork.isForSale == true || artwork.listingType == "product" {
            return EastwoodTheme.sand
        }
        return EastwoodTheme.mistBlue
    }

    private var cardAccent: Color {
        if artwork.caseRecord != nil {
            return Color(red: 0.42, green: 0.57, blue: 0.47)
        }
        if artwork.isForSale == true || artwork.listingType == "product" {
            return Color(red: 0.56, green: 0.48, blue: 0.31)
        }
        return Color(red: 0.40, green: 0.55, blue: 0.69)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ZStack(alignment: .topLeading) {
                heroImage

                LinearGradient(
                    colors: [
                        Color.black.opacity(0.02),
                        Color.clear,
                        cardAccent.opacity(0.10),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                HStack(spacing: 8) {
                    metaChip((artwork.isOfficial ?? false) ? language.text("artwork.official") : language.text("artwork.user"), color: (artwork.isOfficial ?? false) ? .blue : .orange)
                    metaChip(statusLabel, color: statusColor)
                }
                .padding(12)
            }

            VStack(alignment: .leading, spacing: 10) {
                VStack(alignment: .leading, spacing: 6) {
                    if let codeLine {
                        Text(codeLine.uppercased())
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(EastwoodTheme.goldSoft)
                            .tracking(1)
                    }

                    Text(artwork.displayTitle(in: language.language))
                        .font(.system(size: 24, weight: .bold, design: .serif))
                        .foregroundStyle(EastwoodTheme.ink)
                        .lineLimit(3)

                    Text(subtitleLine)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                Divider()

                HStack(alignment: .lastTextBaseline) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(trailingContext.uppercased())
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .tracking(0.8)
                        Text(priceOrCode)
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundStyle(priceAccent)
                            .lineLimit(2)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(artwork.displayCategory(in: language.language))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(EastwoodTheme.ink)
                        Text(artwork.displayPeriod(in: language.language))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(14)
        .background(
            LinearGradient(
                colors: [
                    EastwoodTheme.panel,
                    cardTint.opacity(0.48),
                    EastwoodTheme.ivory,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(cardAccent.opacity(0.12), lineWidth: 1)
        )
        .shadow(color: cardAccent.opacity(0.08), radius: 16, y: 8)
        .shadow(color: Color.black.opacity(0.04), radius: 22, y: 10)
    }

    private var heroImage: some View {
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
        .aspectRatio(1.28, contentMode: .fit)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func metaChip(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(Capsule().stroke(color.opacity(0.22), lineWidth: 1))
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

    private var statusLabel: String {
        if artwork.isForSale == true {
            return language.text("artwork.forSale")
        }
        if artwork.caseRecord != nil {
            return language.text("artwork.returnCase")
        }
        return language.text("artwork.notForSale")
    }

    private var statusColor: Color {
        if artwork.isForSale == true {
            return .teal
        }
        if artwork.caseRecord != nil {
            return .green
        }
        return .secondary
    }

    private var codeLine: String? {
        if let caseId = artwork.caseRecord?.caseId, !caseId.isEmpty {
            return caseId
        }
        if let collectionId = artwork.collectionId, !collectionId.isEmpty {
            return collectionId
        }
        return nil
    }

    private var subtitleLine: String {
        if let caseRecord = artwork.caseRecord {
            let platform = caseRecord.salePlatform.trimmingCharacters(in: .whitespacesAndNewlines)
            let region = caseRecord.clientRegion.trimmingCharacters(in: .whitespacesAndNewlines)
            return [platform, region].filter { !$0.isEmpty }.joined(separator: " • ")
        }
        return [artwork.displayCategory(in: language.language), artwork.displayPeriod(in: language.language)]
            .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .joined(separator: " • ")
    }

    private var priceOrCode: String {
        if artwork.isForSale == true {
            return formattedPrice
        }
        if let salePrice = artwork.caseRecord?.salePrice, !salePrice.isEmpty {
            return salePrice
        }
        return codeLine ?? listingLabel(for: artwork)
    }

    private var trailingContext: String {
        if artwork.isForSale == true {
            return listingLabel(for: artwork)
        }
        if let saleTime = artwork.caseRecord?.saleTime, !saleTime.isEmpty {
            return saleTime
        }
        return language.text("detail.type")
    }

    private var priceAccent: Color {
        if artwork.isForSale == true {
            return EastwoodTheme.gold
        }
        if artwork.caseRecord != nil {
            return EastwoodTheme.goldSoft
        }
        return EastwoodTheme.ink
    }

    private var formattedPrice: String {
        let trimmedCurrency = artwork.currency?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let currencyCode = trimmedCurrency.isEmpty ? "USD" : trimmedCurrency
        let amount = Int((artwork.price ?? 0).rounded())

        switch currencyCode {
        case "CNY":
            return "¥\(amount.formatted())"
        case "USD":
            return "$\(amount.formatted())"
        default:
            return "\(currencyCode) \(amount.formatted())"
        }
    }
}

struct NativeArtworkCompactCard: View {
    @EnvironmentObject private var language: LanguageManager
    let artwork: NativeArtwork

    private var cardTint: Color {
        if artwork.caseRecord != nil {
            return EastwoodTheme.sage
        }
        if artwork.isForSale == true || artwork.listingType == "product" {
            return EastwoodTheme.sand
        }
        return EastwoodTheme.mistBlue
    }

    private var cardAccent: Color {
        if artwork.caseRecord != nil {
            return Color(red: 0.42, green: 0.57, blue: 0.47)
        }
        if artwork.isForSale == true || artwork.listingType == "product" {
            return Color(red: 0.56, green: 0.48, blue: 0.31)
        }
        return Color(red: 0.40, green: 0.55, blue: 0.69)
    }

    private var compactCardHeight: CGFloat {
        EastwoodLayout.compactCardHeight(for: UIScreen.main.bounds.width)
    }

    private var compactImageHeight: CGFloat {
        compactCardHeight * 0.56
    }

    private var isCaseCard: Bool { artwork.caseRecord != nil }
    private var isShopCard: Bool { artwork.isForSale == true || artwork.listingType == "product" }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.88),
                                cardTint.opacity(0.28),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(compactImageContent.padding(8))
                    .overlay(alignment: .bottom) {
                        VStack(spacing: 0) {
                            Spacer(minLength: 0)
                            HStack {
                                Text(imageFooterLabel)
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(cardAccent)
                                    .lineLimit(1)
                                Spacer(minLength: 8)
                                Text(imageFooterValue)
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(EastwoodTheme.ink.opacity(0.82))
                                    .lineLimit(1)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(.ultraThinMaterial)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(cardAccent.opacity(0.08), lineWidth: 1)
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: compactImageHeight)

                HStack(spacing: 5) {
                    compactChip(topBadge, color: cardAccent)
                    if let codeLine, !codeLine.isEmpty {
                        compactChip(codeLine, color: EastwoodTheme.goldSoft)
                    }
                }
                .padding(8)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(curationLabel)
                    .font(.caption2.weight(.semibold))
                    .tracking(1)
                    .foregroundStyle(cardAccent.opacity(0.85))
                    .lineLimit(1)

                Text(artwork.displayTitle(in: language.language))
                    .font(.system(size: 15, weight: .bold, design: .serif))
                    .foregroundStyle(EastwoodTheme.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, minHeight: 34, maxHeight: 34, alignment: .topLeading)

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, minHeight: 14, maxHeight: 14, alignment: .leading)

                Divider()
                    .overlay(EastwoodTheme.hairline)

                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(contextLabel)
                            .font(.caption2.weight(.semibold))
                            .tracking(0.8)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        Text(priceLine)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(cardAccent)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 0)

                    VStack(alignment: .trailing, spacing: 1) {
                        Text(bottomMetaLine)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(EastwoodTheme.goldSoft)
                            .lineLimit(1)
                        Text(bottomCodeLine)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 20, maxHeight: 20, alignment: .topLeading)
            }
            .frame(maxWidth: .infinity, minHeight: 66, maxHeight: 66, alignment: .topLeading)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .frame(height: compactCardHeight, alignment: .top)
        .background(
            LinearGradient(
                colors: [EastwoodTheme.panel, cardTint.opacity(0.45), EastwoodTheme.ivory],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(cardAccent.opacity(0.12), lineWidth: 1)
        )
        .shadow(color: cardAccent.opacity(0.08), radius: 12, y: 6)
        .shadow(color: Color.black.opacity(0.03), radius: 16, y: 8)
    }

    private func compactChip(_ text: String, color: Color) -> some View {
        Text(text.uppercased())
            .font(.caption2.weight(.semibold))
            .foregroundStyle(color)
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(Capsule().stroke(color.opacity(0.16), lineWidth: 1))
    }

    @ViewBuilder
    private var compactImageContent: some View {
        AsyncImage(url: artwork.imageURL) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .empty:
                ZStack {
                    cardTint.opacity(0.20)
                    ProgressView()
                }
            case .failure:
                ZStack {
                    cardTint.opacity(0.20)
                    Image(systemName: "photo")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
            @unknown default:
                cardTint.opacity(0.20)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var topBadge: String {
        if isCaseCard {
            return language.text("artwork.returnCase")
        }
        if isShopCard {
            return language.text("artwork.forSale")
        }
        return language.text("artwork.collection")
    }

    private var subtitle: String {
        if let caseRecord = artwork.caseRecord {
            return [caseRecord.salePlatform, caseRecord.clientRegion]
                .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
                .joined(separator: " • ")
        }
        return [artwork.displayCategory(in: language.language), artwork.displayPeriod(in: language.language)]
            .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .joined(separator: " • ")
    }

    private var priceLine: String {
        if let salePrice = artwork.caseRecord?.salePrice, !salePrice.isEmpty {
            return salePrice
        }
        guard isShopCard, let price = artwork.price else {
            return artwork.collectionId ?? artwork.displayPeriod(in: language.language)
        }
        let amount = Int(price.rounded()).formatted()
        switch artwork.currency?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "USD" {
        case "CNY":
            return "¥\(amount)"
        case "USD":
            return "$\(amount)"
        default:
            return "\(artwork.currency ?? "USD") \(amount)"
        }
    }

    private var curationLabel: String {
        if isCaseCard {
            return "ARCHIVE"
        }
        if isShopCard {
            return "SALON"
        }
        return "CURATION"
    }

    private var contextLabel: String {
        if isCaseCard {
            return language.language == .chinese ? "成交信息" : "SALE NOTE"
        }
        if isShopCard {
            return language.language == .chinese ? "标价" : "ASKING"
        }
        return language.language == .chinese ? "档案编号" : "CATALOG"
    }

    private var imageFooterLabel: String {
        if isCaseCard {
            return language.language == .chinese ? "平台" : "Platform"
        }
        if isShopCard {
            return language.language == .chinese ? "状态" : "Status"
        }
        return language.language == .chinese ? "类别" : "Category"
    }

    private var imageFooterValue: String {
        if isCaseCard {
            let platform = artwork.caseRecord?.salePlatform.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return platform.isEmpty ? artwork.displayCategory(in: language.language) : platform
        }
        if isShopCard {
            return language.text("artwork.forSale")
        }
        return artwork.displayCategory(in: language.language)
    }

    private var bottomMetaLine: String {
        if isCaseCard {
            let region = artwork.caseRecord?.clientRegion.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return region.isEmpty ? artwork.displayCategory(in: language.language) : region
        }
        if isShopCard {
            return artwork.displayCategory(in: language.language)
        }
        return artwork.displayPeriod(in: language.language)
    }

    private var bottomCodeLine: String {
        if let caseId = artwork.caseRecord?.caseId, !caseId.isEmpty {
            return caseId.uppercased()
        }
        if let collectionId = artwork.collectionId, !collectionId.isEmpty {
            return collectionId.uppercased()
        }
        return artwork.displayPeriod(in: language.language)
    }

    private var codeLine: String? {
        if let caseId = artwork.caseRecord?.caseId, !caseId.isEmpty {
            return caseId
        }
        if let collectionId = artwork.collectionId, !collectionId.isEmpty {
            return collectionId
        }
        return nil
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

            VStack(alignment: .leading, spacing: 6) {
                Text(artwork.displayTitle(in: language.language))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.ink)
                    .lineLimit(2)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        rowPill((artwork.isOfficial ?? false) ? language.text("artwork.official") : language.text("artwork.user"), color: (artwork.isOfficial ?? false) ? .blue : .orange)
                        rowPill(trailingBottom, color: artwork.isForSale == true ? .teal : (artwork.caseRecord != nil ? .green : .secondary))
                        if artwork.caseRecord != nil {
                            rowPill(language.text("artwork.returnCase"), color: .green)
                        }
                    }
                }

                Text(detailLine)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                VStack(alignment: .leading, spacing: 2) {
                    Text(secondaryLine)
                        .font(.caption2)
                        .foregroundStyle(EastwoodTheme.mutedText)
                        .lineLimit(1)

                    if let codeLine {
                        Text(codeLine)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(EastwoodTheme.goldSoft)
                            .lineLimit(1)
                            .truncationMode(.middle)
                    }
                }
            }

            Spacer(minLength: 6)

            VStack(alignment: .trailing, spacing: 6) {
                Text(priceOrCode)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(priceAccent)
                    .multilineTextAlignment(.trailing)
                    .lineLimit(2)

                Text(trailingContext)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
                    .lineLimit(2)
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
        if let caseRecord = artwork.caseRecord,
           !caseRecord.salePlatform.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return caseRecord.salePlatform
        }
        return "\(artwork.displayCategory(in: language.language)) • \(artwork.displayPeriod(in: language.language))"
    }

    private var secondaryLine: String {
        let source = (artwork.isOfficial ?? false) ? language.text("artwork.official") : language.text("artwork.community")
        if let caseRecord = artwork.caseRecord,
           !caseRecord.clientRegion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "\(source) • \(caseRecord.clientRegion)"
        }
        return source
    }

    private var codeLine: String? {
        if let caseRecord = artwork.caseRecord,
           !caseRecord.caseId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "\(language.text("artwork.id")): \(caseRecord.caseId)"
        }
        if let collectionId = artwork.collectionId,
           !collectionId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "\(language.text("artwork.id")): \(collectionId)"
        }
        return nil
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

    private var priceOrCode: String {
        if artwork.isForSale == true {
            return formattedPrice
        }
        if let caseRecord = artwork.caseRecord,
           !caseRecord.salePrice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return caseRecord.salePrice
        }
        if let caseRecord = artwork.caseRecord {
            return caseRecord.caseId
        }
        return artwork.displayPeriod(in: language.language)
    }

    private var trailingContext: String {
        if artwork.isForSale == true {
            return listingLabel(for: artwork)
        }
        if let caseRecord = artwork.caseRecord,
           !caseRecord.saleTime.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return caseRecord.saleTime
        }
        return trailingBottom
    }

    private var priceAccent: Color {
        if artwork.isForSale == true {
            return EastwoodTheme.gold
        }
        if artwork.caseRecord != nil {
            return EastwoodTheme.goldSoft
        }
        return EastwoodTheme.ink
    }

    private var formattedPrice: String {
        let trimmedCurrency = artwork.currency?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let currencyCode = trimmedCurrency.isEmpty ? "USD" : trimmedCurrency
        let amount = Int((artwork.price ?? 0).rounded())

        switch currencyCode {
        case "CNY":
            return "¥\(amount.formatted())"
        case "USD":
            return "$\(amount.formatted())"
        default:
            return "\(currencyCode) \(amount.formatted())"
        }
    }

    private func rowPill(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(color.opacity(0.12), in: Capsule())
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
