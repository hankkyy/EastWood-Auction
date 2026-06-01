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
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var favorites: FavoritesManager
    @StateObject private var uploaderLookup = NativeUploaderLookupManager()
    @State private var showInquiryForm = false
    @State private var selectedImageIndex = 0

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
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
                        HStack(spacing: 8) {
                            ForEach(Array(galleryUrls.enumerated()), id: \.offset) { index, url in
                                AsyncImage(url: URL(string: url)) { phase in
                                    switch phase {
                                    case .success(let image): image.resizable().scaledToFill()
                                    default: Color.white.opacity(0.08)
                                    }
                                }
                                .frame(width: 64, height: 64)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .stroke(selectedImageIndex == index ? EastwoodTheme.goldSoft : EastwoodTheme.hairline, lineWidth: selectedImageIndex == index ? 2 : 1)
                                )
                                .onTapGesture { selectedImageIndex = index }
                            }
                        }
                    }
                }

                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(artwork.localizedTitle).font(.title2.weight(.bold))
                        HStack(spacing: 8) {
                            chip(localizedCategory)
                            chip(localizedPeriod)
                            chip(artwork.listingType.capitalized)
                        }
                        HStack(spacing: 8) {
                            chip((artwork.isOfficial ?? false) ? "Platform Upload" : "Personal Upload")
                            if artwork.caseRecord != nil {
                                chip("Case")
                            }
                            if artwork.isForSale == true {
                                chip("For Sale")
                            } else {
                                chip("Not For Sale")
                            }
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

                VStack(alignment: .leading, spacing: 6) {
                    if artwork.isForSale == true {
                        Text("For Sale")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.green)
                        Text("\(artwork.currency ?? "USD") \(String(format: "%.0f", artwork.price ?? 0))")
                            .font(.title3.weight(.semibold))
                    } else {
                        Text("Not For Sale")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(12)
                .eastwoodPanel()

                VStack(alignment: .leading, spacing: 8) {
                    Text("Item Info").font(.headline)
                    infoRow("Source", (artwork.isOfficial ?? false) ? "Platform Upload" : "Personal Upload")
                    if let code = inquiryCode, !code.isEmpty {
                        infoRow("Inquiry Code", code)
                    }
                    if auth.isAdmin, let uploader = artwork.uploadedBy, !uploader.isEmpty {
                        if let email = uploaderLookup.uploaderEmail, !email.isEmpty {
                            infoRow("Uploader Email", email)
                        }
                        infoRow("Uploader ID", uploader)
                    }
                }
                .padding(12)
                .eastwoodPanel()

                if let inquiryCode, !inquiryCode.isEmpty {
                    Button("Ask About This Item") {
                        showInquiryForm = true
                    }
                    .buttonStyle(EastwoodPrimaryButtonStyle())
                }

                if let caseRecord = artwork.caseRecord {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Case Details").font(.headline)
                        infoRow("Case ID", caseRecord.caseId)
                        infoRow("Sale Price", caseRecord.salePrice)
                        infoRow("Sale Time", caseRecord.saleTime)
                        infoRow("Sale Platform", caseRecord.salePlatform)
                        infoRow("Client Region", caseRecord.clientRegion)
                        optionalInfoRow("Logistics Cost", caseRecord.logisticsCost)
                        optionalInfoRow("Purchase Channel", caseRecord.purchaseChannel)
                        optionalInfoRow("Purchase Cost", caseRecord.purchaseCost)
                        optionalInfoRow("Risk Advice", caseRecord.riskAdvice)
                    }
                    .padding(12)
                    .eastwoodPanel()
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Description").font(.headline)
                    Text(localizedDescription)
                        .font(.body)
                }
                .padding(12)
                .eastwoodPanel()
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle("Detail")
        .navigationBarTitleDisplayMode(.inline)
        .background(EastwoodBackground())
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
        let zh = artwork.categoryZh?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return zh.isEmpty ? artwork.category : zh
    }

    private var localizedPeriod: String {
        let zh = artwork.periodZh?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return zh.isEmpty ? artwork.period : zh
    }

    private var localizedDescription: String {
        let zh = artwork.descriptionZh?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return zh.isEmpty ? artwork.description : zh
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

    @ViewBuilder
    private func optionalInfoRow(_ label: String, _ value: String) -> some View {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            infoRow(label, trimmed)
        }
    }
}
