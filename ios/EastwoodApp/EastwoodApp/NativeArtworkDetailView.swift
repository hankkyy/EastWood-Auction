import SwiftUI

// MARK: - Uploader Lookup

private struct NativeAdminProfileLite: Decodable {
    let id: String
    let email: String?
}

private struct NativeAdminProfileLiteResponse: Decodable {
    let profiles: [NativeAdminProfileLite]
}

@MainActor
private final class NativeUploaderLookupManager: ObservableObject {
    @Published var uploaderEmail: String?

    func loadUploaderEmail(token: String, uploaderId: String) async {
        guard let api = NativeAPIClient() else { return }
        do {
            let data = try await api.requestJSON(path: "api/admin/profiles", token: token, retries: 1)
            let decoded = try JSONDecoder().decode(NativeAdminProfileLiteResponse.self, from: data)
            uploaderEmail = decoded.profiles.first(where: { $0.id == uploaderId })?.email
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            uploaderEmail = nil
        }
    }
}

// MARK: - Detail View

struct NativeArtworkDetailView: View {
    let artwork: NativeArtwork
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var favorites: FavoritesManager
    @StateObject private var uploaderLookup = NativeUploaderLookupManager()
    @State private var showInquiryForm = false
    @State private var showManageFlow = false
    @State private var selectedImageIndex = 0
    @State private var showShareSheet = false
    @State private var showLightbox = false

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        let pad = EastwoodLayout.pagePadding(for: pageWidth)

        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // Hero image gallery
                gallerySection(pageWidth: pageWidth)

                // Title & actions
                titleSection
                    .padding(.horizontal, pad)

                // Price & status card
                if artwork.isForSale == true {
                    priceCard
                        .padding(.horizontal, pad)
                }

                // Status chips
                statusChips
                    .padding(.horizontal, pad)

                // Availability section
                detailSectionCard(title: language.text("detail.availability"), icon: "tag") {
                    infoRow(label: language.text("detail.listingType"), value: listingLabel)
                    infoRow(label: language.text("detail.status"),
                            value: artwork.isForSale == true
                            ? language.text("artwork.forSale")
                            : language.text("artwork.notForSale"))
                    if let cid = artwork.collectionId?.trimmingCharacters(in: .whitespacesAndNewlines), !cid.isEmpty {
                        infoRow(label: language.text("detail.collectionId"), value: cid)
                    }
                    if artwork.isForSale == true {
                        infoRow(label: language.text("detail.price"), value: formattedPrice)
                    }
                }
                .padding(.horizontal, pad)

                // Item info
                detailSectionCard(title: language.text("detail.itemInfo"), icon: "info.circle") {
                    infoRow(label: language.text("detail.category"), value: localizedCategory)
                    infoRow(label: language.text("detail.period"), value: localizedPeriod)
                    infoRow(label: language.text("detail.source"),
                            value: (artwork.isOfficial ?? false)
                            ? language.text("detail.platformUpload")
                            : language.text("detail.personalUpload"))
                    if let code = inquiryCode {
                        infoRow(label: language.text("detail.inquiryCode"), value: code)
                    }
                    if auth.isAdmin, let uploader = artwork.uploadedBy?.trimmingCharacters(in: .whitespacesAndNewlines), !uploader.isEmpty {
                        if let email = uploaderLookup.uploaderEmail, !email.isEmpty {
                            infoRow(label: language.text("detail.uploaderEmail"), value: email)
                        }
                        infoRow(label: language.text("detail.uploaderId"), value: uploader)
                    }
                }
                .padding(.horizontal, pad)

                // Case details — 2-column grid matching web
                if let cr = artwork.caseRecord {
                    detailSectionCard(title: language.text("detail.caseDetails"), icon: "doc.text") {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            caseField(label: language.text("detail.caseId"), value: cr.caseId)
                            caseField(label: language.language == .chinese ? "分类" : "Category", value: localizedCategory)
                            caseField(label: language.text("detail.saleTime"), value: cr.saleTime)
                            caseField(label: language.text("detail.salePrice"), value: cr.salePrice)
                            caseField(label: language.text("detail.salePlatform"), value: cr.salePlatform)
                            caseField(label: language.text("detail.clientRegion"), value: cr.clientRegion)
                            if !cr.logisticsCost.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                caseField(label: language.text("detail.logisticsCost"), value: cr.logisticsCost)
                            }
                            if !cr.purchaseChannel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                caseField(label: language.text("detail.purchaseChannel"), value: cr.purchaseChannel)
                            }
                            if !cr.purchaseCost.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                caseField(label: language.text("detail.purchaseCost"), value: cr.purchaseCost)
                            }
                        }
                        // Risk advice — full width
                        if !cr.riskAdvice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            Divider().padding(.vertical, 4)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(language.text("detail.riskAdvice"))
                                    .font(.caption.weight(.semibold)).foregroundStyle(EastwoodTheme.warning)
                                Text(cr.riskAdvice)
                                    .font(.subheadline).foregroundStyle(EastwoodTheme.ink)
                            }
                        }
                    }
                    .padding(.horizontal, pad)
                }

                // Description
                detailSectionCard(title: language.text("detail.description"), icon: "text.alignleft") {
                    Text(localizedDescription)
                        .font(.body)
                        .foregroundStyle(EastwoodTheme.ink)
                        .lineSpacing(4)
                }
                .padding(.horizontal, pad)

                // Actions
                VStack(spacing: 10) {
                    if let code = inquiryCode, !code.isEmpty {
                        Button {
                            showInquiryForm = true
                        } label: { Label(language.text("detail.askAbout"), systemImage: "paperplane.fill") }
                        .buttonStyle(EastwoodPrimaryButtonStyle())
                    }
                    if canManageArtwork {
                        Button {
                            showManageFlow = true
                        } label: { Label(language.text("detail.manageItem"), systemImage: "slider.horizontal.3") }
                        .buttonStyle(EastwoodSecondaryButtonStyle())
                    }
                    Button { showShareSheet = true } label: {
                        Label(language.language == .chinese ? "分享" : "Share", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                }
                .padding(.horizontal, pad)

                // Related items
                if !relatedItems.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(language.text("detail.relatedItems"))
                                    .font(.system(size: 18, weight: .bold, design: .serif)).foregroundStyle(EastwoodTheme.ink)
                                Text(language.text("detail.relatedItems.subtitle"))
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(relatedItems) { item in
                                    NavigationLink(value: item) {
                                        relatedItemCard(item)
                                    }.buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, pad)
                }
            }
            .padding(.vertical, 12)
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    guard auth.isAuthenticated else { return }
                    Task { await favorites.toggle(artworkId: artwork.id, token: auth.accessToken) }
                } label: {
                    Image(systemName: favorites.favoriteIDs.contains(artwork.id) ? "heart.fill" : "heart")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(favorites.favoriteIDs.contains(artwork.id) ? EastwoodTheme.redAccent : EastwoodTheme.gold)
                }
                .disabled(!auth.isAuthenticated)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .eastwoodScreen()
        .onAppear {
            selectedImageIndex = max(0, galleryUrls.firstIndex(of: artwork.image) ?? 0)
            if auth.isAdmin, artwork.isOfficial != true,
               let uploader = artwork.uploadedBy?.trimmingCharacters(in: .whitespacesAndNewlines),
               !uploader.isEmpty, uploaderLookup.uploaderEmail == nil {
                Task { await uploaderLookup.loadUploaderEmail(token: auth.accessToken, uploaderId: uploader) }
            }
        }
        .onChange(of: auth.accessToken) { newValue in
            guard auth.isAdmin, artwork.isOfficial != true,
                  let uploader = artwork.uploadedBy?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !uploader.isEmpty, !newValue.isEmpty else { return }
            Task { await uploaderLookup.loadUploaderEmail(token: newValue, uploaderId: uploader) }
        }
        .navigationDestination(isPresented: $showInquiryForm) {
            NativeInquiryFormView(prefilledCode: inquiryCode)
        }
        .sheet(isPresented: $showManageFlow) {
            NavigationStack {
                NativeArtworkManagementView(kind: managementKind, mode: .manage, initialEditingArtwork: artwork)
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = URL(string: "\(AppConfig.webAppURLString)collections/\(artwork.id)") {
                ShareSheet(items: [artwork.displayTitle(in: language.language), url])
            } else {
                ShareSheet(items: [artwork.displayTitle(in: language.language)])
            }
        }
        .fullScreenCover(isPresented: $showLightbox) {
            NativeImageLightbox(imageUrls: galleryUrls, initialIndex: selectedImageIndex)
        }
    }

    // MARK: - Title Section

    private var titleSection: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text(artwork.displayTitle(in: language.language))
                    .font(.system(size: 24, weight: .bold, design: .serif))
                    .foregroundStyle(EastwoodTheme.ink)
                HStack(spacing: 6) {
                    Text(localizedCategory)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                    Text("•").foregroundStyle(.secondary)
                    Text(localizedPeriod)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
    }

    // MARK: - Price Card

    private var priceCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(language.language == .chinese ? "售价" : "Price")
                    .font(.caption).foregroundStyle(.secondary)
                Text(formattedPrice)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(EastwoodTheme.goldDark)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(language.text("detail.type"))
                    .font(.caption).foregroundStyle(.secondary)
                Text(listingLabel)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.ink)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(EastwoodTheme.panel)
        )
        .shadow(color: EastwoodTheme.gold.opacity(0.10), radius: 8, y: 3)
    }

    // MARK: - Status Chips

    private var statusChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                statusChip(
                    artwork.isForSale == true
                        ? language.text("artwork.forSale")
                        : language.text("artwork.notForSale"),
                    color: artwork.isForSale == true ? EastwoodTheme.redAccent : .secondary
                )
                statusChip(listingLabel, color: EastwoodTheme.gold)
                if isCase {
                    statusChip(language.text("artwork.case"), color: EastwoodTheme.casesAccent)
                }
                statusChip(
                    (artwork.isOfficial ?? false)
                        ? language.text("detail.platformUpload")
                        : language.text("detail.personalUpload"),
                    color: (artwork.isOfficial ?? false) ? .blue : .orange
                )
            }
        }
    }

    private func statusChip(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(color.opacity(0.10), in: Capsule())
            .foregroundStyle(color)
    }

    // MARK: - Related Items

    private var relatedItems: [NativeArtwork] {
        // For now, return empty — will be populated when the API supports recommendations
        []
    }

    @ViewBuilder
    private func relatedItemCard(_ artwork: NativeArtwork) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            AsyncImage(url: artwork.imageURL) { phase in
                switch phase {
                case .success(let img): img.resizable().scaledToFill()
                case .empty: Rectangle().fill(EastwoodTheme.panelSoft).overlay(ProgressView().tint(EastwoodTheme.gold))
                case .failure: Rectangle().fill(EastwoodTheme.panelSoft).overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                @unknown default: Rectangle().fill(EastwoodTheme.panelSoft)
                }
            }
            .frame(width: 140, height: 110).clipped()

            VStack(alignment: .leading, spacing: 3) {
                Text(artwork.displayTitle(in: language.language))
                    .font(.caption2.weight(.semibold)).foregroundStyle(EastwoodTheme.ink).lineLimit(1)
                Text(artwork.displayCategory(in: language.language))
                    .font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
            }
            .padding(.horizontal, 8).padding(.vertical, 8)
        }
        .frame(width: 140)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(EastwoodTheme.panel))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 4, y: 2)
    }

    // MARK: - Gallery

    @ViewBuilder
    private func gallerySection(pageWidth: CGFloat) -> some View {
        VStack(spacing: 0) {
            // Main gallery with overlay arrows
            ZStack {
                TabView(selection: $selectedImageIndex) {
                    ForEach(Array(galleryUrls.enumerated()), id: \.offset) { index, url in
                        AsyncImage(url: URL(string: url)) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFill()
                            case .empty:
                                ZStack { Rectangle().fill(EastwoodTheme.panelSoft); ProgressView().tint(EastwoodTheme.gold) }
                            case .failure:
                                ZStack { Rectangle().fill(EastwoodTheme.panelSoft); Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary) }
                            @unknown default:
                                Rectangle().fill(EastwoodTheme.panelSoft)
                            }
                        }
                        .tag(index)
                    }
                }
                .frame(height: EastwoodLayout.heroImageHeight(for: pageWidth))
                .clipped()
                .tabViewStyle(.page(indexDisplayMode: .automatic))
                .onTapGesture { showLightbox = true }

                // Overlay prev/next arrows (matching web)
                if galleryUrls.count > 1 {
                    HStack {
                        Button {
                            guard !galleryUrls.isEmpty else { return }
                            withAnimation { selectedImageIndex = (selectedImageIndex - 1 + galleryUrls.count) % galleryUrls.count }
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.title3.weight(.bold))
                                .foregroundStyle(.white)
                                .frame(width: 36, height: 36)
                                .background(Circle().fill(Color.black.opacity(0.35)))
                        }
                        Spacer()
                        Button {
                            guard !galleryUrls.isEmpty else { return }
                            withAnimation { selectedImageIndex = (selectedImageIndex + 1) % galleryUrls.count }
                        } label: {
                            Image(systemName: "chevron.right")
                                .font(.title3.weight(.bold))
                                .foregroundStyle(.white)
                                .frame(width: 36, height: 36)
                                .background(Circle().fill(Color.black.opacity(0.35)))
                        }
                    }
                    .padding(.horizontal, 8)

                    // Counter badge (bottom-right)
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Text("\(selectedImageIndex + 1) / \(galleryUrls.count)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(Color.black.opacity(0.5), in: Capsule())
                                .padding(12)
                        }
                    }
                }
            }

            // Thumbnail strip
            if galleryUrls.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(galleryUrls.enumerated()), id: \.offset) { index, url in
                            AsyncImage(url: URL(string: url)) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().scaledToFill()
                                default:
                                    EastwoodTheme.panelSoft
                                }
                            }
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .stroke(
                                        selectedImageIndex == index
                                            ? EastwoodTheme.gold : Color.clear,
                                        lineWidth: 2
                                    )
                            )
                            .opacity(selectedImageIndex == index ? 1.0 : 0.5)
                            .onTapGesture {
                                withAnimation { selectedImageIndex = index }
                            }
                        }
                    }
                    .padding(.horizontal, EastwoodLayout.pagePadding(for: pageWidth))
                    .padding(.vertical, 8)
                }
            }
        }
    }

    // MARK: - Section Card

    private func detailSectionCard<Content: View>(title: String, icon: String,
                                                   @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.gold)
                Text(title)
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(EastwoodTheme.ink)
            }
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .eastwoodPanel()
    }

    // MARK: - Helpers

    private func caseField(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.system(size: 11)).foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold)).foregroundStyle(EastwoodTheme.ink)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EastwoodTheme.panelSoft.opacity(0.6), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(width: 100, alignment: .leading)
            Text(value)
                .font(.subheadline)
                .foregroundStyle(EastwoodTheme.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private func optionalRow(label: String, value: String) -> some View {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            infoRow(label: label, value: trimmed)
        }
    }

    // MARK: - Computed Properties

    private var isCase: Bool { artwork.caseRecord != nil }

    private var localizedCategory: String { artwork.displayCategory(in: language.language) }
    private var localizedPeriod: String { artwork.displayPeriod(in: language.language) }

    private var localizedDescription: String {
        if language.language == .chinese {
            let zh = artwork.descriptionZh?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return zh.isEmpty ? artwork.description : zh
        }
        return artwork.description
    }

    private var listingLabel: String {
        if isCase { return language.text("artwork.returnCase") }
        switch artwork.listingType {
        case "product": return language.text("artwork.product")
        case "collection": return language.text("artwork.collection")
        default: return artwork.listingType.capitalized
        }
    }

    private var managementKind: NativeSectionKind {
        if isCase { return .cases }
        if artwork.listingType == "product" || artwork.isForSale == true { return .shop }
        return .collections
    }

    private var canManageArtwork: Bool {
        if auth.isAdmin { return true }
        guard auth.isAuthenticated, !auth.currentUserId.isEmpty else { return false }
        return artwork.uploadedBy == auth.currentUserId
    }

    private var inquiryCode: String? {
        if let cid = artwork.collectionId?.trimmingCharacters(in: .whitespacesAndNewlines), !cid.isEmpty { return cid }
        if let caseId = artwork.caseRecord?.caseId.trimmingCharacters(in: .whitespacesAndNewlines), !caseId.isEmpty { return caseId }
        return nil
    }

    private var galleryUrls: [String] {
        let items = artwork.galleryImages?.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } ?? []
        return items.isEmpty ? [artwork.image] : items
    }

    private var formattedPrice: String {
        let code = artwork.currency?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let c = code.isEmpty ? "USD" : code
        let a = Int((artwork.price ?? 0).rounded())
        switch c {
        case "CNY": return "¥\(a.formatted())"
        case "USD": return "$\(a.formatted())"
        default: return "\(c) \(a.formatted())"
        }
    }
}
