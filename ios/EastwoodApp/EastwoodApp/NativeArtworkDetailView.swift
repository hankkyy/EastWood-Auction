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
                            chip(artwork.listingType.capitalized)
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
                    detailStatCard(title: language.text("detail.type"), value: artwork.listingType.capitalized, accent: EastwoodTheme.gold)
                    detailStatCard(title: language.text("detail.price"), value: artwork.isForSale == true ? "\(artwork.currency ?? "USD") \(String(format: "%.0f", artwork.price ?? 0))" : "--", accent: EastwoodTheme.goldSoft)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(language.text("detail.itemInfo"))
                        .font(.system(size: 22, weight: .bold, design: .rounded))
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
                .padding(12)
                .eastwoodPanel()

                if let inquiryCode, !inquiryCode.isEmpty {
                    Button(language.text("detail.askAbout")) {
                        showInquiryForm = true
                    }
                    .buttonStyle(EastwoodPrimaryButtonStyle())
                }

                if let caseRecord = artwork.caseRecord {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(language.text("detail.caseDetails"))
                            .font(.system(size: 22, weight: .bold, design: .rounded))
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
                    .padding(12)
                    .eastwoodPanel()
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(language.text("detail.description"))
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                    Text(localizedDescription)
                        .font(.body)
                }
                .padding(12)
                .eastwoodPanel()
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

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text(value)
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
}
