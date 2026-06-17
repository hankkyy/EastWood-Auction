import SwiftUI

// MARK: - Xiaohongshu Note Card (大图笔记卡片 — 用于瀑布流)

struct NativeArtworkCompactCard: View {
    enum DisplayStyle { case standard, homeFeed }

    @EnvironmentObject private var language: LanguageManager
    let artwork: NativeArtwork
    var showsCode: Bool = true
    var showsPrice: Bool = true
    var displayStyle: DisplayStyle = .standard
    var imageHeightOverride: CGFloat? = nil
    @State private var isPressed = false

    private var isCase: Bool { artwork.caseRecord != nil }
    private var isShop: Bool { artwork.isForSale == true || artwork.listingType == "product" }

    private var cardAccent: Color {
        if isCase { return EastwoodTheme.casesAccent }
        if isShop { return EastwoodTheme.shopAccent }
        return EastwoodTheme.collectionsAccent
    }

    private var imageHeight: CGFloat {
        imageHeightOverride ?? {
            let w = UIScreen.main.bounds.width
            if isCase { return w * 0.50 }
            if isShop { return w * 0.47 }
            return w * 0.52
        }()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // 大图区域 — 小红书笔记风格
            ZStack(alignment: .bottomLeading) {
                AsyncImage(url: artwork.imageURL) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().scaledToFill()
                    case .empty:
                        Rectangle().fill(EastwoodTheme.panelSoft)
                            .overlay(ProgressView().tint(EastwoodTheme.gold))
                    case .failure:
                        Rectangle().fill(EastwoodTheme.panelSoft)
                            .overlay(Image(systemName: "photo").font(.title2).foregroundStyle(.secondary))
                    @unknown default:
                        Rectangle().fill(EastwoodTheme.panelSoft)
                    }
                }
                .frame(height: imageHeight)
                .clipped()

                // 图片底部渐变 + 标签（小红书风格 sticker）
                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.35)],
                    startPoint: .center, endPoint: .bottom
                )

                HStack(spacing: 4) {
                    if isShop {
                        priceSticker
                    }
                    Spacer()
                    if isCase {
                        Text(language.text("artwork.case"))
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7).padding(.vertical, 3)
                            .background(EastwoodTheme.casesAccent.opacity(0.85), in: Capsule())
                    }
                }
                .padding(8)
            }

            // 文字区 — 小红书极简风格
            VStack(alignment: .leading, spacing: 5) {
                Text(artwork.displayTitle(in: language.language))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(EastwoodTheme.inkSoft)
                    .lineLimit(2)
                    .lineSpacing(1.2)
                    .frame(maxWidth: .infinity, alignment: .leading)

                HStack(spacing: 4) {
                    // 小店标签
                    Image(systemName: "storefront")
                        .font(.system(size: 8))
                    Text(artwork.displayCategory(in: language.language))
                        .font(.system(size: 10))
                }
                .foregroundStyle(EastwoodTheme.inkMuted)
                .lineLimit(1)
            }
            .padding(.horizontal, 8).padding(.vertical, 9)
        }
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(EastwoodTheme.panel)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: EastwoodTheme.shadowLight, radius: 3, y: 1)
        .scaleEffect(isPressed ? 0.975 : 1.0)
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in isPressed = pressing }, perform: {})
    }

    private var priceSticker: some View {
        let p = artwork.price ?? 0
        let trimmed = artwork.currency?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let code = trimmed.isEmpty ? "USD" : trimmed
        let a = Int(p.rounded())
        let symbol = code == "CNY" ? "¥" : "$"
        return Text("\(symbol)\(a.formatted())")
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 7).padding(.vertical, 3)
            .background(EastwoodTheme.redAccent.opacity(0.88), in: Capsule())
    }
}

// MARK: - App Store Style Featured Card (大卡片)

struct NativeArtworkCard: View {
    @EnvironmentObject private var language: LanguageManager
    let artwork: NativeArtwork
    @State private var isPressed = false

    private var isCase: Bool { artwork.caseRecord != nil }
    private var isShop: Bool { artwork.isForSale == true || artwork.listingType == "product" }

    private var cardAccent: Color {
        if isCase { return EastwoodTheme.casesAccent }
        if isShop { return EastwoodTheme.shopAccent }
        return EastwoodTheme.collectionsAccent
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // 大图 — App Store Today 卡片风格
            ZStack(alignment: .bottomLeading) {
                AsyncImage(url: artwork.imageURL) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().scaledToFill()
                    case .empty:
                        Rectangle().fill(EastwoodTheme.panelSoft)
                            .overlay(ProgressView().tint(EastwoodTheme.gold))
                    case .failure:
                        Rectangle().fill(EastwoodTheme.panelSoft)
                            .overlay(Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary))
                    @unknown default:
                        Rectangle().fill(EastwoodTheme.panelSoft)
                    }
                }
                .frame(height: 240)
                .clipped()

                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.5)],
                    startPoint: .center, endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        if isShop {
                            tagChip(language.text("artwork.forSale"), color: EastwoodTheme.redAccent)
                        }
                        if isCase {
                            tagChip(language.text("artwork.case"), color: EastwoodTheme.casesAccent)
                        }
                        tagChip(artwork.displayCategory(in: language.language), color: .white.opacity(0.25))
                    }
                    Text(artwork.displayTitle(in: language.language))
                        .font(.system(size: 20, weight: .bold, design: .serif))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                }
                .padding(18)
            }

            // 底部信息
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    if isShop, let price = artwork.price {
                        Text(formattedPrice(price, artwork.currency))
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundStyle(EastwoodTheme.goldDark)
                    }
                    HStack(spacing: 4) {
                        Image(systemName: "clock").font(.system(size: 9))
                        Text(artwork.displayPeriod(in: language.language))
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "arrow.right.circle.fill")
                    .font(.title2)
                    .foregroundStyle(cardAccent.opacity(0.6))
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
        }
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(EastwoodTheme.panel)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: EastwoodTheme.shadowCard, radius: 10, y: 4)
        .scaleEffect(isPressed ? 0.985 : 1.0)
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in isPressed = pressing }, perform: {})
    }

    private func tagChip(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(color, in: Capsule())
    }

    private func formattedPrice(_ price: Double, _ currency: String?) -> String {
        let code = currency?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let c = code.isEmpty ? "USD" : code
        let a = Int(price.rounded())
        switch c { case "CNY": return "¥\(a.formatted())"; case "USD": return "$\(a.formatted())"; default: return "\(c) \(a.formatted())" }
    }
}

// MARK: - List Row (列表行)

struct NativeArtworkListRow: View {
    @EnvironmentObject private var language: LanguageManager
    let artwork: NativeArtwork
    var embedded: Bool = false
    @State private var isPressed = false

    private var isCase: Bool { artwork.caseRecord != nil }
    private var isShop: Bool { artwork.isForSale == true || artwork.listingType == "product" }
    private var accent: Color {
        if isCase { return EastwoodTheme.casesAccent }
        if isShop { return EastwoodTheme.shopAccent }
        return EastwoodTheme.collectionsAccent
    }

    var body: some View {
        HStack(spacing: 14) {
            // 缩略图 — 干净白底
            AsyncImage(url: artwork.imageURL) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().scaledToFill()
                case .empty:
                    Rectangle().fill(EastwoodTheme.panelSoft)
                        .overlay(ProgressView().tint(EastwoodTheme.gold))
                case .failure:
                    Rectangle().fill(EastwoodTheme.panelSoft)
                        .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                @unknown default:
                    Rectangle().fill(EastwoodTheme.panelSoft)
                }
            }
            .frame(width: 68, height: 68)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text(artwork.displayTitle(in: language.language))
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(EastwoodTheme.inkSoft)
                    .lineLimit(embedded ? 1 : 2)

                HStack(spacing: 5) {
                    Circle().fill(accent).frame(width: 6, height: 6)
                    Text(artwork.displayCategory(in: language.language))
                        .font(.system(size: 11)).foregroundStyle(.secondary)
                    if !artwork.displayPeriod(in: language.language).isEmpty {
                        Text("·").foregroundStyle(.secondary)
                        Text(artwork.displayPeriod(in: language.language))
                            .font(.system(size: 11)).foregroundStyle(.secondary)
                    }
                }

                if isShop {
                    Text(priceText)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(EastwoodTheme.goldDark)
                }

                HStack(spacing: 4) {
                    if isCase { miniTag(language.text("artwork.case"), EastwoodTheme.casesAccent) }
                    if artwork.isForSale == true { miniTag(language.text("artwork.forSale"), EastwoodTheme.redAccent) }
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption2.weight(.bold)).foregroundStyle(.secondary.opacity(0.3))
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(EastwoodTheme.panel)
        )
        .shadow(color: EastwoodTheme.shadowLight, radius: 2, y: 1)
        .scaleEffect(isPressed ? 0.988 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in isPressed = pressing }, perform: {})
    }

    private var priceText: String {
        let code = artwork.currency?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let c = code.isEmpty ? "USD" : code; let a = Int((artwork.price ?? 0).rounded())
        switch c { case "CNY": return "¥\(a.formatted())"; case "USD": return "$\(a.formatted())"; default: return "\(c) \(a.formatted())" }
    }

    private func miniTag(_ text: String, _ color: Color) -> some View {
        Text(text).font(.system(size: 9, weight: .semibold))
            .padding(.horizontal, 5).padding(.vertical, 2)
            .background(color.opacity(0.12), in: Capsule()).foregroundStyle(color)
    }
}
