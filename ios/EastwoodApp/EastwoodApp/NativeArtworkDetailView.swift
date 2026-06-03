import SwiftUI

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

struct NativeArtworkDetailView: View {
    let artwork: NativeArtwork
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var favorites: FavoritesManager
    @StateObject private var uploaderLookup = NativeUploaderLookupManager()
    @State private var showInquiryForm = false
    @State private var selectedImageIndex = 0

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                TabView(selection: $selectedImageIndex) {
                    ForEach(Array(galleryUrls.enumerated()), id: \.offset) { index, url in
                        AsyncImage(url: URL(string: url)) { phase in
                            switch phase {
                            case .success(let image): image.resizable().scaledToFill()
                            case .empty: ZStack { Color.gray.opacity(0.2); ProgressView() }
                            case .failure: ZStack { Color.gray.opacity(0.2); Image(systemName: "photo") }
                            @unknown default: Color.gray.opacity(0.2)
                            }
                        }
                        .tag(index)
                    }
                }
                .frame(height: EastwoodLayout.heroImageHeight(for: pageWidth))
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .tabViewStyle(.page(indexDisplayMode: .automatic))

                if galleryUrls.count > 1 {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(Array(galleryUrls.enumerated()), id: \.offset) { index, url in
                                AsyncImage(url: URL(string: url)) { phase in
                                    switch phase {
                                    case .success(let image): image.resizable().scaledToFill()
                                    default: EastwoodTheme.panelSoft
                                    }
                                }
                                .frame(width: 44, height: 44)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .stroke(selectedImageIndex == index ? EastwoodTheme.gold : EastwoodTheme.hairline, lineWidth: selectedImageIndex == index ? 2 : 1)
                                )
                                .onTapGesture { selectedImageIndex = index }
                            }
                        }
                    }
                }

                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(artwork.displayTitle(in: language.language))
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundStyle(EastwoodTheme.ink)
                        HStack(spacing: 8) {
                            chip(localizedCategory)
                            chip(localizedPeriod)
                            chip(listingLabel)
                        }
                        HStack(spacing: 8) {
                            chip((artwork.isOfficial ?? false) ? language.text("detail.platformUpload") : language.text("detail.personalUpload"))
                            if artwork.caseRecord != nil {
                                chip(language.text("artwork.case"))
                            }
                            if artwork.isForSale == true {
                                chip(language.text("artwork.forSale"))
                            } else {
                                chip(language.text("artwork.notForSale"))
                            }
                        }
                    }

                    Spacer()

                    Button {
                        guard auth.isAuthenticated else { return }
                        Task { await favorites.toggle(artworkId: artwork.id, token: auth.accessToken) }
                    } label: {
                        Circle()
                            .fill(Color.white.opacity(0.92))
                            .frame(width: 42, height: 42)
                            .overlay(
                                Image(systemName: favorites.favoriteIDs.contains(artwork.id) ? "heart.fill" : "heart")
                                    .font(.title3)
                                    .foregroundStyle(EastwoodTheme.gold)
                            )
                    }
                    .disabled(!auth.isAuthenticated)
                }

                HStack(spacing: 10) {
                    detailStatCard(title: language.text("detail.status"), value: artwork.isForSale == true ? language.text("artwork.forSale") : language.text("detail.archive"), accent: artwork.isForSale == true ? .green : EastwoodTheme.gold)
                    detailStatCard(title: language.text("detail.type"), value: listingLabel, accent: EastwoodTheme.gold)
                    detailStatCard(title: language.text("detail.price"), value: artwork.isForSale == true ? "\(artwork.currency ?? "USD") \(String(format: "%.0f", artwork.price ?? 0))" : "--", accent: EastwoodTheme.goldSoft)
                }

                detailSection(
                    title: language.text("detail.itemInfo"),
                    subtitle: itemInfoSubtitle
                ) {
                    infoRow(language.text("detail.source"), (artwork.isOfficial ?? false) ? language.text("detail.platformUpload") : language.text("detail.personalUpload"))
                    if let code = inquiryCode, !code.isEmpty {
                        infoRow(language.text("detail.inquiryCode"), code)
                    }
                    if auth.isAdmin, let uploader = artwork.uploadedBy, !uploader.isEmpty {
                        if let email = uploaderLookup.uploaderEmail, !email.isEmpty {
                            infoRow(language.text("detail.uploaderEmail"), email)
                        }
                        infoRow(language.text("detail.uploaderId"), uploader)
                    }
                }

                if let inquiryCode, !inquiryCode.isEmpty {
                    Button(language.text("detail.askAbout")) {
                        showInquiryForm = true
                    }
                    .buttonStyle(EastwoodPrimaryButtonStyle())
                }

                if let caseRecord = artwork.caseRecord {
                    detailSection(
                        title: language.text("detail.caseDetails"),
                        subtitle: caseDetailsSubtitle
                    ) {
                        infoRow(language.text("detail.caseId"), caseRecord.caseId)
                        infoRow(language.text("detail.salePrice"), caseRecord.salePrice)
                        infoRow(language.text("detail.saleTime"), caseRecord.saleTime)
                        infoRow(language.text("detail.salePlatform"), caseRecord.salePlatform)
                        infoRow(language.text("detail.clientRegion"), caseRecord.clientRegion)
                        optionalInfoRow(language.text("detail.logisticsCost"), caseRecord.logisticsCost)
                        optionalInfoRow(language.text("detail.purchaseChannel"), caseRecord.purchaseChannel)
                        optionalInfoRow(language.text("detail.purchaseCost"), caseRecord.purchaseCost)
                        optionalInfoRow(language.text("detail.riskAdvice"), caseRecord.riskAdvice)
                    }
                }

                detailSection(
                    title: language.text("detail.description"),
                    subtitle: descriptionSubtitle
                ) {
                    Text(localizedDescription)
                        .font(.body)
                        .foregroundStyle(EastwoodTheme.ink)
                }
            }
        .padding(.horizontal, EastwoodLayout.pagePadding(for: pageWidth))
        .padding(.top, 8)
        .padding(.bottom, 12)
        }
        .navigationTitle(language.text("detail.title"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .eastwoodScreen()
        .onAppear {
            let first = galleryUrls.first ?? artwork.image
            selectedImageIndex = max(0, galleryUrls.firstIndex(of: first) ?? 0)
            if auth.isAdmin,
               artwork.isOfficial != true,
               let uploader = artwork.uploadedBy?.trimmingCharacters(in: .whitespacesAndNewlines),
               !uploader.isEmpty,
               uploaderLookup.uploaderEmail == nil {
                Task { await uploaderLookup.loadUploaderEmail(token: auth.accessToken, uploaderId: uploader) }
            }
        }
        .onChange(of: auth.accessToken) { newValue in
            guard auth.isAdmin,
                  artwork.isOfficial != true,
                  let uploader = artwork.uploadedBy?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !uploader.isEmpty,
                  !newValue.isEmpty else { return }
            Task { await uploaderLookup.loadUploaderEmail(token: newValue, uploaderId: uploader) }
        }
        .navigationDestination(isPresented: $showInquiryForm) {
            NativeInquiryFormView(prefilledCode: inquiryCode)
        }
    }

    private var localizedCategory: String {
        artwork.displayCategory(in: language.language)
    }

    private var localizedPeriod: String {
        artwork.displayPeriod(in: language.language)
    }

    private var localizedDescription: String {
        if language.language == .chinese {
            let zh = artwork.descriptionZh?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return zh.isEmpty ? artwork.description : zh
        }
        return artwork.description
    }

    private var listingLabel: String {
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

    private var inquiryCode: String? {
        if let cid = artwork.collectionId?.trimmingCharacters(in: .whitespacesAndNewlines), !cid.isEmpty {
            return cid
        }
        if let caseId = artwork.caseRecord?.caseId.trimmingCharacters(in: .whitespacesAndNewlines), !caseId.isEmpty {
            return caseId
        }
        return nil
    }

    private var galleryUrls: [String] {
        let items = artwork.galleryImages?.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } ?? []
        return items.isEmpty ? [artwork.image] : items
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(EastwoodTheme.panelSoft, in: Capsule())
            .overlay(Capsule().stroke(EastwoodTheme.hairline, lineWidth: 1))
    }

    private func detailStatCard(title: String, value: String, accent: Color) -> some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(accent)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, minHeight: 56)
        .padding(.horizontal, 6)
        .eastwoodPanel()
    }

    private func detailSection<Content: View>(title: String, subtitle: String? = nil, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(EastwoodTheme.ink)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                content()
            }
        }
        .padding(12)
        .eastwoodPanel()
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .foregroundStyle(.secondary)
                .frame(width: 108, alignment: .leading)
            Text(value)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .font(.subheadline)
    }

    @ViewBuilder
    private func optionalInfoRow(_ label: String, _ value: String) -> some View {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            infoRow(label, trimmed)
        }
    }

    private var itemInfoSubtitle: String {
        if artwork.caseRecord != nil {
            return language.language == .chinese ? "用于核对编号、来源和上传者信息，和管理页保持一致。" : "Use this section to verify code, source, and uploader information in the same structure as the management view."
        }
        if artwork.isForSale == true {
            return language.language == .chinese ? "这里汇总前台商品识别信息，方便咨询与后台管理同时核对。" : "This section summarizes the public-facing product identifiers so inquiry and admin flows reference the same details."
        }
        return language.language == .chinese ? "这里汇总展示项的识别信息，方便列表、详情和后台统一引用。" : "This section gathers the showcase identifiers so list, detail, and admin views all reference the same metadata."
    }

    private var caseDetailsSubtitle: String {
        language.language == .chinese ? "成交、地区、物流和避坑信息会统一展示在这里，方便案例复盘。" : "Sale facts, region, logistics, and advisory notes are grouped here so the case can be reviewed quickly."
    }

    private var descriptionSubtitle: String {
        if artwork.caseRecord != nil {
            return language.language == .chinese ? "这里适合放案例背景、藏品说明或后续咨询时需要引用的文字。" : "Use this section for case background, object notes, or the narrative buyers may reference during inquiry."
        }
        return language.language == .chinese ? "这里展示更完整的藏品或商品说明，和网页详情页的说明区保持一致。" : "This section presents the fuller object or product narrative, aligned with the descriptive area on the web detail pages."
    }
}
