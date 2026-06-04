import PhotosUI
import SwiftUI
import UIKit

private func adminArtworkText(_ key: String) -> String {
    LanguageManager().text(key)
}

private func adminArtworkFormat(_ key: String, _ args: CVarArg...) -> String {
    let manager = LanguageManager()
    return String(format: manager.text(key), locale: manager.language.locale, arguments: args)
}

struct AdminCaseInput {
    var caseId = ""
    var salePrice = ""
    var saleTime = ""
    var salePlatform = ""
    var clientRegion = ""
    var logisticsCost = ""
    var purchaseChannel = ""
    var purchaseCost = ""
    var riskAdvice = ""

    var isEnabled: Bool {
        !caseId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var payload: [String: Any]? {
        guard isEnabled else { return nil }
        return [
            "caseId": caseId,
            "salePrice": salePrice,
            "saleTime": saleTime,
            "salePlatform": salePlatform,
            "clientRegion": clientRegion,
            "logisticsCost": logisticsCost,
            "purchaseChannel": purchaseChannel,
            "purchaseCost": purchaseCost,
            "riskAdvice": riskAdvice,
        ]
    }
}

struct AdminArtworkInput {
    var title = ""
    var titleZh = ""
    var category = ""
    var categoryZh = ""
    var period = ""
    var periodZh = ""
    var image = ""
    var galleryImagesText = ""
    var description = ""
    var descriptionZh = ""
    var listingType = "product"
    var isForSale = false
    var price = ""
    var currency = "CNY"
    var collectionId = ""
    var caseData = AdminCaseInput()

    var galleryImages: [String] {
        let lines = galleryImagesText
            .split(whereSeparator: \.isNewline)
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        return lines.isEmpty ? [image] : lines
    }

    func validate(existingCollectionIDs: Set<String> = [], currentArtworkId: String? = nil) -> String? {
        if title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return adminArtworkText("admin.validation.titleRequired")
        }
        if category.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return adminArtworkText("admin.validation.categoryRequired")
        }
        if period.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return adminArtworkText("admin.validation.periodRequired")
        }
        if !image.lowercased().hasPrefix("http") {
            return adminArtworkText("admin.validation.coverUrlInvalid")
        }
        if description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return adminArtworkText("admin.validation.descriptionRequired")
        }
        if listingType == "collection" && collectionId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return adminArtworkText("admin.validation.collectionRequired")
        }
        let normalizedCollectionId = collectionId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !normalizedCollectionId.isEmpty {
            let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789-_")
            if normalizedCollectionId.rangeOfCharacter(from: allowed.inverted) != nil {
                return adminArtworkText("admin.validation.collectionFormat")
            }
            let conflict = existingCollectionIDs.contains(normalizedCollectionId)
            if conflict {
                return adminArtworkText("admin.validation.collectionExists")
            }
        }
        if isForSale {
            guard let p = Double(price), p > 0 else {
                return adminArtworkText("admin.validation.pricePositive")
            }
        }
        if caseData.isEnabled {
            if caseData.salePrice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return adminArtworkText("admin.validation.caseSalePrice")
            }
            if caseData.saleTime.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return adminArtworkText("admin.validation.caseSaleTime")
            }
            if caseData.salePlatform.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return adminArtworkText("admin.validation.caseSalePlatform")
            }
        }
        for url in galleryImages where !url.lowercased().hasPrefix("http") {
            return adminArtworkText("admin.validation.galleryUrlInvalid")
        }
        return nil
    }
}

@MainActor
final class NativeAdminArtworksManager: ObservableObject {
    @Published var artworks: [NativeArtwork] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    struct ImportResult {
        let success: Bool
        let message: String?
    }

    func load() async {
        guard let base = AppConfig.webAppURL else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let (data, response) = try await URLSession.shared.data(from: base.appendingPathComponent("api/artworks"))
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                throw URLError(.badServerResponse)
            }
            let decoded = try JSONDecoder().decode(NativeArtworkResponse.self, from: data)
            artworks = decoded.artworks
        } catch {
            errorMessage = adminArtworkText("admin.error.loadArtworks")
        }
    }

    func create(input: AdminArtworkInput, token: String) async -> Bool {
        let result = await createWithResult(input: input, token: token)
        return result.success
    }

    func createWithResult(input: AdminArtworkInput, token: String) async -> ImportResult {
        guard let base = AppConfig.webAppURL else {
            return ImportResult(success: false, message: adminArtworkText("admin.error.invalidBaseUrl"))
        }
        do {
            let priceValue = Double(input.price)
            var artwork: [String: Any] = [
                "id": UUID().uuidString,
                "title": input.title,
                "titleZh": input.titleZh.isEmpty ? NSNull() : input.titleZh,
                "category": input.category,
                "categoryZh": input.categoryZh.isEmpty ? NSNull() : input.categoryZh,
                "period": input.period,
                "periodZh": input.periodZh.isEmpty ? NSNull() : input.periodZh,
                "image": input.image,
                "galleryImages": input.galleryImages,
                "description": input.description,
                "descriptionZh": input.descriptionZh.isEmpty ? NSNull() : input.descriptionZh,
                "listingType": input.listingType,
                "featureVector": [0, 0, 0, 0, 0, 0, 0, 0],
                "isForSale": input.isForSale,
                "price": priceValue as Any,
                "currency": input.currency,
                "collectionId": input.collectionId.isEmpty ? NSNull() : input.collectionId,
            ]
            artwork["caseRecord"] = input.caseData.payload ?? NSNull()

            let payload: [String: Any] = ["artwork": artwork]
            var req = URLRequest(url: base.appendingPathComponent("api/artworks"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.httpBody = try JSONSerialization.data(withJSONObject: payload)

            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else {
                return ImportResult(success: false, message: adminArtworkText("admin.error.invalidServerResponse"))
            }
            if http.statusCode == 401 || http.statusCode == 403 {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
                return ImportResult(success: false, message: adminArtworkText("admin.error.unauthorized"))
            }
            guard (200...299).contains(http.statusCode) else {
                if let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let error = payload["error"] as? String,
                   !error.isEmpty {
                    return ImportResult(success: false, message: error)
                }
                return ImportResult(success: false, message: adminArtworkFormat("admin.error.requestFailed", http.statusCode))
            }
            await load()
            return ImportResult(success: true, message: nil)
        } catch {
            return ImportResult(success: false, message: error.localizedDescription)
        }
    }

    func update(artwork: NativeArtwork, input: AdminArtworkInput, token: String) async -> Bool {
        guard let base = AppConfig.webAppURL else { return false }
        do {
            let priceValue = Double(input.price)
            var artworkBody: [String: Any] = [
                "id": artwork.id,
                "title": input.title,
                "titleZh": input.titleZh.isEmpty ? NSNull() : input.titleZh,
                "category": input.category,
                "categoryZh": input.categoryZh.isEmpty ? NSNull() : input.categoryZh,
                "period": input.period,
                "periodZh": input.periodZh.isEmpty ? NSNull() : input.periodZh,
                "image": input.image,
                "galleryImages": input.galleryImages,
                "description": input.description,
                "descriptionZh": input.descriptionZh.isEmpty ? NSNull() : input.descriptionZh,
                "listingType": input.listingType,
                "featureVector": artwork.featureVector,
                "isForSale": input.isForSale,
                "price": priceValue as Any,
                "currency": input.currency,
                "collectionId": input.collectionId.isEmpty ? NSNull() : input.collectionId,
            ]
            artworkBody["caseRecord"] = input.caseData.payload ?? NSNull()

            let payload: [String: Any] = ["artwork": artworkBody]
            var req = URLRequest(url: base.appendingPathComponent("api/artworks/\(artwork.id)"))
            req.httpMethod = "PATCH"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.httpBody = try JSONSerialization.data(withJSONObject: payload)

            let (_, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else { return false }
            if http.statusCode == 401 || http.statusCode == 403 {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
                return false
            }
            guard (200...299).contains(http.statusCode) else { return false }
            await load()
            return true
        } catch {
            return false
        }
    }

    func delete(artworkId: String, token: String) async -> Bool {
        guard let base = AppConfig.webAppURL else { return false }
        do {
            var req = URLRequest(url: base.appendingPathComponent("api/artworks/\(artworkId)"))
            req.httpMethod = "DELETE"
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            let (_, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else { return false }
            if http.statusCode == 401 || http.statusCode == 403 {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
                return false
            }
            guard (200...299).contains(http.statusCode) else { return false }
            artworks.removeAll { $0.id == artworkId }
            return true
        } catch {
            return false
        }
    }
}

@MainActor
private final class AdminImageUploader: ObservableObject {
    @Published var isUploading = false
    @Published var uploadError: String?

    func upload(imageData: Data, fileName: String = "ios-admin.jpg") async -> String? {
        guard let base = AppConfig.webAppURL else { return nil }
        guard let uiImage = UIImage(data: imageData),
              let jpeg = uiImage.jpegData(compressionQuality: 0.88) else {
            uploadError = adminArtworkText("admin.error.invalidImage")
            return nil
        }

        isUploading = true
        uploadError = nil
        defer { isUploading = false }

        do {
            let dataUrl = "data:image/jpeg;base64,\(jpeg.base64EncodedString())"
            var req = URLRequest(url: base.appendingPathComponent("api/image-search/upload"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: [
                "imageDataUrl": dataUrl,
                "fileName": fileName,
            ])

            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                throw URLError(.badServerResponse)
            }
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            return json?["imageUrl"] as? String
        } catch {
            uploadError = adminArtworkText("admin.error.uploadFailed")
            return nil
        }
    }
}

struct NativeAdminArtworksView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var manager = NativeAdminArtworksManager()

    @State private var creating = false
    @State private var editingArtwork: NativeArtwork?
    @State private var batchImporting = false
    @State private var query = ""
    @State private var listingFilter = "all"
    @State private var saleFilter = "all"
    @State private var priceFilter = "all"
    @State private var caseFilter = "all"
    @State private var selectionMode = false
    @State private var selectedIds: Set<String> = []
    @State private var showImportReport = false
    @State private var importReportTitle = ""
    @State private var importReportDetails: [String] = []
    @State private var importSuccessCount = 0
    @State private var importTotalCount = 0
    @State private var deletingArtwork: NativeArtwork?
    @State private var confirmingBatchDelete = false
    @State private var isOperating = false

    private var filteredArtworks: [NativeArtwork] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        var searched = q.isEmpty ? manager.artworks : manager.artworks.filter {
            $0.title.lowercased().contains(q)
            || ($0.titleZh ?? "").lowercased().contains(q)
            || $0.category.lowercased().contains(q)
            || $0.period.lowercased().contains(q)
        }
        switch listingFilter {
        case "product":
            searched = searched.filter { $0.listingType == "product" }
        case "collection":
            searched = searched.filter { $0.listingType == "collection" }
        case "case":
            searched = searched.filter { $0.caseRecord != nil }
        default:
            break
        }

        switch saleFilter {
        case "forSale":
            searched = searched.filter { $0.isForSale == true }
        case "notForSale":
            searched = searched.filter { $0.isForSale != true }
        default:
            break
        }

        switch priceFilter {
        case "under1k":
            searched = searched.filter { ($0.price ?? .infinity) < 1000 }
        case "1kTo5k":
            searched = searched.filter {
                let p = $0.price ?? -1
                return p >= 1000 && p <= 5000
            }
        case "above5k":
            searched = searched.filter { ($0.price ?? -1) > 5000 }
        default:
            break
        }

        switch caseFilter {
        case "hasCase":
            searched = searched.filter { $0.caseRecord != nil }
        case "noCase":
            searched = searched.filter { $0.caseRecord == nil }
        default:
            break
        }

        return searched
    }

    private var exportCSV: String {
        var rows = ["id,title,title_zh,category,category_zh,period,period_zh,listing_type,is_for_sale,price,currency,collection_id,has_case,uploaded_by,is_official"]
        for item in filteredArtworks {
            let title = item.title.replacingOccurrences(of: "\"", with: "\"\"")
            let titleZh = (item.titleZh ?? "").replacingOccurrences(of: "\"", with: "\"\"")
            let category = item.category.replacingOccurrences(of: "\"", with: "\"\"")
            let categoryZh = (item.categoryZh ?? "").replacingOccurrences(of: "\"", with: "\"\"")
            let period = item.period.replacingOccurrences(of: "\"", with: "\"\"")
            let periodZh = (item.periodZh ?? "").replacingOccurrences(of: "\"", with: "\"\"")
            let collectionId = (item.collectionId ?? "").replacingOccurrences(of: "\"", with: "\"\"")
            let uploader = (item.uploadedBy ?? "").replacingOccurrences(of: "\"", with: "\"\"")
            rows.append("\(item.id),\"\(title)\",\"\(titleZh)\",\"\(category)\",\"\(categoryZh)\",\"\(period)\",\"\(periodZh)\",\(item.listingType),\(item.isForSale == true),\(item.price ?? 0),\(item.currency ?? ""),\"\(collectionId)\",\(item.caseRecord != nil),\"\(uploader)\",\(item.isOfficial == true)")
        }
        return rows.joined(separator: "\n")
    }

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        Group {
            if !auth.isAdmin {
                EastwoodStateView(
                    systemImage: "lock.shield",
                    title: language.text("admin.accessRequired"),
                    message: language.text("admin.artworks.subtitle")
                )
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(language.text("admin.artworks.header"))
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundStyle(EastwoodTheme.ink)
                            Text(language.text("admin.artworks.subtitle"))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .eastwoodPanel()

                        VStack(spacing: 10) {
                            TextField(language.text("admin.artworks.search"), text: $query)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled(true)
                                .eastwoodInput()

                            Picker(language.text("admin.artworks.type"), selection: $listingFilter) {
                                Text(language.text("admin.artworks.all")).tag("all")
                                Text(language.text("admin.artworks.product")).tag("product")
                                Text(language.text("admin.artworks.collection")).tag("collection")
                                Text(language.text("admin.artworks.case")).tag("case")
                            }
                            .pickerStyle(.segmented)

                            HStack {
                                Picker(language.text("admin.artworks.sale"), selection: $saleFilter) {
                                    Text(language.text("admin.artworks.saleAll")).tag("all")
                                    Text(language.text("admin.artworks.forSale")).tag("forSale")
                                    Text(language.text("admin.artworks.notForSale")).tag("notForSale")
                                }
                                .pickerStyle(.menu)

                                Picker(language.text("admin.artworks.price"), selection: $priceFilter) {
                                    Text(language.text("admin.artworks.priceAll")).tag("all")
                                    Text(language.text("admin.artworks.priceUnder1k")).tag("under1k")
                                    Text(language.text("admin.artworks.price1kTo5k")).tag("1kTo5k")
                                    Text(language.text("admin.artworks.priceAbove5k")).tag("above5k")
                                }
                                .pickerStyle(.menu)
                            }

                            Picker(language.text("admin.artworks.case"), selection: $caseFilter) {
                                Text(language.text("admin.artworks.caseAll")).tag("all")
                                Text(language.text("admin.artworks.hasCase")).tag("hasCase")
                                Text(language.text("admin.artworks.noCase")).tag("noCase")
                            }
                            .pickerStyle(.segmented)

                            HStack {
                                Text(language.format("admin.artworks.count", String(filteredArtworks.count)))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                Spacer()
                            }
                        }
                        .padding(14)
                        .eastwoodPanel()

                        if let error = manager.errorMessage {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(error).foregroundStyle(.red)
                                Button(language.text("admin.retry")) { Task { await manager.load() } }
                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                            }
                            .padding(14)
                            .eastwoodPanel()
                        }

                        if !manager.isLoading && manager.errorMessage == nil && filteredArtworks.isEmpty {
                            Text(language.text("admin.artworks.none"))
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .eastwoodPanel()
                        }

                        ForEach(filteredArtworks) { artwork in
                            HStack {
                                if selectionMode {
                                    Image(systemName: selectedIds.contains(artwork.id) ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(selectedIds.contains(artwork.id) ? .green : .secondary)
                                }
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(artwork.displayTitle(in: language.language)).font(.headline)
                                    Text("\(artwork.displayCategory(in: language.language)) · \(artwork.displayPeriod(in: language.language))")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    HStack(spacing: 6) {
                                        adminChip((artwork.isOfficial ?? false) ? language.text("admin.artworks.official") : language.text("admin.artworks.user"), color: (artwork.isOfficial ?? false) ? .blue : .orange)
                                        adminChip(listingText(for: artwork.listingType), color: .purple)
                                        if artwork.caseRecord != nil {
                                            adminChip(language.text("admin.artworks.case"), color: .green)
                                        }
                                        if artwork.isForSale == true {
                                            let priceText = "\(artwork.currency ?? "CNY") \(Int(artwork.price ?? 0))"
                                            adminChip(priceText, color: .teal)
                                        }
                                    }
                                    .padding(.top, 2)
                                    if let cid = artwork.collectionId, !cid.isEmpty {
                                        Text("\(language.text("admin.artworks.collectionId")): \(cid)")
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                    if let uploader = artwork.uploadedBy, !uploader.isEmpty {
                                        Text("\(language.text("admin.artworks.uploader")): \(uploader)")
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                            .truncationMode(.middle)
                                    }
                                }
                                Spacer()
                                if !selectionMode {
                                    Button { editingArtwork = artwork } label: { Image(systemName: "pencil") }
                                        .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })

                                    Button(role: .destructive) {
                                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                        deletingArtwork = artwork
                                    } label: {
                                        Image(systemName: "trash")
                                    }
                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                    .disabled(isOperating)
                                }
                            }
                            .padding(14)
                            .eastwoodPanel()
                            .contentShape(Rectangle())
                            .onTapGesture {
                                guard selectionMode else { return }
                                if selectedIds.contains(artwork.id) {
                                    selectedIds.remove(artwork.id)
                                } else {
                                    selectedIds.insert(artwork.id)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, pad)
                    .padding(.vertical, 12)
                }
            }
        }
        .overlay {
            if auth.isAdmin && manager.isLoading {
                EastwoodSkeletonList(count: 4)
                    .padding(.horizontal, pad)
            }
        }
        .navigationTitle(language.text("admin.artworks.title"))
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(selectionMode ? language.text("admin.done") : language.text("admin.select")) {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    selectionMode.toggle()
                    if !selectionMode {
                        selectedIds.removeAll()
                    }
                }
                .disabled(!auth.isAdmin || manager.isLoading || filteredArtworks.isEmpty || isOperating)
            }
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: exportCSV, subject: Text(language.text("admin.artworks.exportSubject")), message: Text(language.text("admin.artworks.exportMessage"))) {
                    Image(systemName: "square.and.arrow.up")
                }
                .disabled(filteredArtworks.isEmpty || selectionMode || isOperating)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { creating = true } label: { Image(systemName: "plus") }
                    .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                    .disabled(!auth.isAdmin || manager.isLoading || selectionMode || isOperating)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { batchImporting = true } label: { Image(systemName: "square.and.arrow.down.on.square") }
                    .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                    .disabled(!auth.isAdmin || manager.isLoading || selectionMode || isOperating)
            }
            ToolbarItem(placement: .bottomBar) {
                if selectionMode {
                    Button(role: .destructive) {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        confirmingBatchDelete = true
                    } label: {
                        Text(language.format("admin.artworks.deleteSelected", String(selectedIds.count)))
                    }
                    .disabled(selectedIds.isEmpty || isOperating)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(EastwoodBackground())
        .task { await manager.load() }
        .refreshable { await manager.load() }
        .sheet(isPresented: $creating) {
            AdminArtworkEditor(
                title: language.text("admin.artworks.create"),
                existingCollectionIDs: Set(
                    manager.artworks
                        .compactMap { $0.collectionId?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
                        .filter { !$0.isEmpty }
                )
            ) { input in
                _ = await manager.create(input: input, token: auth.accessToken)
                creating = false
            }
        }
        .sheet(item: $editingArtwork) { artwork in
            AdminArtworkEditor(
                title: language.text("admin.artworks.edit"),
                seed: artwork,
                existingCollectionIDs: Set(
                    manager.artworks
                        .filter { $0.id != artwork.id }
                        .compactMap { $0.collectionId?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
                        .filter { !$0.isEmpty }
                )
            ) { input in
                _ = await manager.update(artwork: artwork, input: input, token: auth.accessToken)
                editingArtwork = nil
            }
        }
        .sheet(isPresented: $batchImporting) {
            AdminBatchImportView { items in
                Task {
                    var successCount = 0
                    var failures: [String] = []

                    for item in items {
                        let result = await manager.createWithResult(input: item, token: auth.accessToken)
                        if result.success {
                            successCount += 1
                        } else {
                            let reason = result.message ?? language.text("admin.artworks.unknownError")
                            failures.append("\(item.title): \(reason)")
                        }
                    }

                    importReportTitle = language.format("admin.artworks.imported", String(successCount), String(items.count))
                    importSuccessCount = successCount
                    importTotalCount = items.count
                    importReportDetails = failures
                    showImportReport = true
                }
                batchImporting = false
            }
        }
        .sheet(isPresented: $showImportReport) {
            ImportReportView(
                title: importReportTitle,
                successCount: importSuccessCount,
                totalCount: importTotalCount,
                failures: importReportDetails
            )
        }
        .alert(language.text("admin.artworks.deleteTitle"), isPresented: Binding(get: { deletingArtwork != nil }, set: { if !$0 { deletingArtwork = nil } })) {
            Button(language.text("common.cancel"), role: .cancel) { deletingArtwork = nil }
            Button(language.text("common.delete"), role: .destructive) {
                guard let artwork = deletingArtwork else { return }
                Task {
                    isOperating = true
                    _ = await manager.delete(artworkId: artwork.id, token: auth.accessToken)
                    isOperating = false
                    deletingArtwork = nil
                }
            }
        } message: {
            Text(language.text("admin.artworks.deleteMessage"))
        }
        .alert(language.text("admin.artworks.deleteSelectedTitle"), isPresented: $confirmingBatchDelete) {
            Button(language.text("common.cancel"), role: .cancel) {}
            Button(language.text("common.delete"), role: .destructive) {
                Task {
                    isOperating = true
                    let ids = selectedIds
                    for id in ids {
                        _ = await manager.delete(artworkId: id, token: auth.accessToken)
                    }
                    selectedIds.removeAll()
                    selectionMode = false
                    isOperating = false
                }
            }
        } message: {
            Text(language.text("admin.artworks.deleteMessage"))
        }
    }

    private func adminChip(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(color.opacity(0.18), in: Capsule())
            .foregroundStyle(color)
    }

    private func listingText(for listingType: String) -> String {
        switch listingType {
        case "product":
            return language.text("admin.artworks.product")
        case "collection":
            return language.text("admin.artworks.collection")
        case "case":
            return language.text("admin.artworks.case")
        default:
            return listingType.capitalized
        }
    }
}

private struct ImportReportView: View {
    @EnvironmentObject private var language: LanguageManager
    let title: String
    let successCount: Int
    let totalCount: Int
    let failures: [String]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section(language.text("admin.summary")) {
                    HStack {
                        Text(language.text("admin.imported"))
                        Spacer()
                        Text("\(successCount) / \(totalCount)")
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text(language.text("admin.failed"))
                        Spacer()
                        Text("\(failures.count)")
                            .foregroundColor(failures.isEmpty ? .secondary : .red)
                    }
                }

                Section(language.text("admin.failureDetails")) {
                    if failures.isEmpty {
                        Text(language.text("admin.importSuccess"))
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(Array(failures.enumerated()), id: \.offset) { _, item in
                            Text(item)
                                .font(.footnote)
                                .foregroundStyle(.red)
                        }
                    }
                }
            }
            .navigationTitle(language.text("admin.importReport"))
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(language.text("common.done")) { dismiss() }
                }
            }
        }
    }
}

private struct AdminBatchImportView: View {
    @EnvironmentObject private var language: LanguageManager
    let onImport: ([AdminArtworkInput]) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var rowsText = ""
    @State private var listingType = "product"
    @State private var category = ""
    @State private var period = ""
    @State private var parseError: String?
    @State private var parseErrors: [String] = []
    @State private var importValidOnly = false

    private var parsedPreview: [AdminArtworkInput] {
        parseRows().items
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(language.text("admin.inputFormat")) {
                    Text(language.text("admin.inputFormat.desc"))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    TextField(language.text("admin.exampleLine"), text: $rowsText, axis: .vertical)
                        .lineLimit(8...14)
                }

                Section(language.text("admin.sharedFields")) {
                    Picker(language.text("admin.listingType"), selection: $listingType) {
                        Text(language.text("admin.artworks.product")).tag("product")
                        Text(language.text("admin.artworks.collection")).tag("collection")
                    }
                    TextField(language.text("admin.category"), text: $category)
                    TextField(language.text("admin.period"), text: $period)
                }

                Section(language.text("admin.validation")) {
                    Text(language.format("admin.validRows", String(parsedPreview.count)))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Toggle(language.text("admin.importValidOnly"), isOn: $importValidOnly)
                    if let parseError {
                        Text(parseError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                    if !parseErrors.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(parseErrors, id: \.self) { err in
                                Text(err)
                                    .font(.caption)
                                    .foregroundStyle(.red)
                            }
                        }
                    }
                }
            }
            .navigationTitle(language.text("admin.batchImport"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(language.text("common.cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(language.text("admin.import")) {
                        let result = parseRows()
                        parseError = result.errors.isEmpty ? nil : result.errors.prefix(3).joined(separator: "\n")
                        parseErrors = Array(result.errors.prefix(20))
                        if importValidOnly {
                            guard !result.items.isEmpty else { return }
                        } else {
                            guard !result.items.isEmpty, result.errors.isEmpty else { return }
                        }
                        onImport(result.items)
                    }
                    .disabled(rowsText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || category.isEmpty || period.isEmpty)
                }
            }
        }
    }

    private func parseRows() -> (items: [AdminArtworkInput], errors: [String]) {
        var items: [AdminArtworkInput] = []
        var errors: [String] = []
        var seenCollectionIds: Set<String> = []

        let lines = rowsText
            .split(whereSeparator: \.isNewline)
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        for (idx, line) in lines.enumerated() {
                let parts = line.split(separator: "|").map(String.init)
                guard parts.count >= 3 else {
                    errors.append(adminArtworkFormat("admin.import.lineFormat", idx + 1))
                    continue
                }
                var input = AdminArtworkInput()
                input.title = parts[0].trimmingCharacters(in: .whitespacesAndNewlines)
                input.image = parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
                input.galleryImagesText = input.image
                input.description = parts[2].trimmingCharacters(in: .whitespacesAndNewlines)
                input.listingType = listingType
                input.category = category
                input.period = period
                if parts.count > 3 {
                    input.price = parts[3].trimmingCharacters(in: .whitespacesAndNewlines)
                    input.isForSale = !input.price.isEmpty
                }
                if parts.count > 4 {
                    input.collectionId = parts[4].trimmingCharacters(in: .whitespacesAndNewlines)
                    let normalized = input.collectionId.lowercased()
                    if !normalized.isEmpty {
                        if seenCollectionIds.contains(normalized) {
                            errors.append(adminArtworkFormat("admin.import.duplicateCollection", idx + 1))
                            continue
                        }
                        seenCollectionIds.insert(normalized)
                    }
                }
                if parts.count > 5 {
                    let c = parts[5].trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    if c == "USD" || c == "CNY" {
                        input.currency = c
                    } else if !c.isEmpty {
                        errors.append(adminArtworkFormat("admin.import.invalidCurrency", idx + 1))
                        continue
                    }
                }
                if parts.count > 6 {
                    input.titleZh = parts[6].trimmingCharacters(in: .whitespacesAndNewlines)
                }
                if parts.count > 7 {
                    input.categoryZh = parts[7].trimmingCharacters(in: .whitespacesAndNewlines)
                }
                if parts.count > 8 {
                    input.periodZh = parts[8].trimmingCharacters(in: .whitespacesAndNewlines)
                }
                if parts.count > 9 {
                    input.descriptionZh = parts[9].trimmingCharacters(in: .whitespacesAndNewlines)
                }
                if parts.count > 10 { input.caseData.caseId = parts[10].trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count > 11 { input.caseData.salePrice = parts[11].trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count > 12 { input.caseData.saleTime = parts[12].trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count > 13 { input.caseData.salePlatform = parts[13].trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count > 14 { input.caseData.clientRegion = parts[14].trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count > 15 { input.caseData.logisticsCost = parts[15].trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count > 16 { input.caseData.purchaseChannel = parts[16].trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count > 17 { input.caseData.purchaseCost = parts[17].trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count > 18 { input.caseData.riskAdvice = parts[18].trimmingCharacters(in: .whitespacesAndNewlines) }
                if let v = input.validate() {
                    errors.append("Line \(idx + 1): \(v)")
                    continue
                }
                items.append(input)
        }
        return (items, errors)
    }
}

private struct AdminArtworkEditor: View {
    @EnvironmentObject private var language: LanguageManager
    let title: String
    var seed: NativeArtwork? = nil
    var existingCollectionIDs: Set<String> = []
    let onSave: (AdminArtworkInput) async -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var input = AdminArtworkInput()
    @State private var saving = false
    @State private var validationError: String?
    @StateObject private var uploader = AdminImageUploader()
    @State private var coverPickerItem: PhotosPickerItem?
    @State private var galleryPickerItems: [PhotosPickerItem] = []

    var body: some View {
        NavigationStack {
            Form {
                Section(language.text("admin.basic")) {
                    TextField(language.text("admin.title"), text: $input.title)
                    TextField(language.text("admin.titleZh"), text: $input.titleZh)
                    TextField(language.text("admin.category"), text: $input.category)
                    TextField(language.text("admin.categoryZh"), text: $input.categoryZh)
                    TextField(language.text("admin.period"), text: $input.period)
                    TextField(language.text("admin.periodZh"), text: $input.periodZh)
                    TextField(language.text("admin.coverUrl"), text: $input.image)
                    TextField(language.text("admin.description"), text: $input.description, axis: .vertical)
                    TextField(language.text("admin.descriptionZh"), text: $input.descriptionZh, axis: .vertical)

                    PhotosPicker(selection: $coverPickerItem, matching: .images) {
                        Label(language.text("admin.uploadCover"), systemImage: "photo")
                    }
                }

                Section(language.text("admin.listing")) {
                    Picker(language.text("admin.listingType"), selection: $input.listingType) {
                        Text(language.text("admin.artworks.product")).tag("product")
                        Text(language.text("admin.artworks.collection")).tag("collection")
                    }
                    Toggle(language.text("admin.artworks.forSale"), isOn: $input.isForSale)
                    TextField(language.text("admin.priceField"), text: $input.price)
                        .keyboardType(.decimalPad)
                    Picker(language.text("admin.currency"), selection: $input.currency) {
                        Text("CNY").tag("CNY")
                        Text("USD").tag("USD")
                    }
                    TextField(language.text("admin.collectionIdField"), text: $input.collectionId)
                    Button(language.text("admin.autoCollectionId")) {
                        input.collectionId = generateCollectionID()
                    }
                    .buttonStyle(.bordered)
                }

                Section(language.text("admin.galleryUrls")) {
                    TextField("https://...", text: $input.galleryImagesText, axis: .vertical)
                        .lineLimit(4...8)

                    PhotosPicker(selection: $galleryPickerItems, matching: .images) {
                        Label(language.text("admin.uploadGallery"), systemImage: "photo.stack")
                    }
                }

                Section(language.text("admin.caseRecord")) {
                    TextField(language.text("admin.caseId"), text: $input.caseData.caseId)
                    TextField(language.text("admin.salePrice"), text: $input.caseData.salePrice)
                    TextField(language.text("admin.saleTime"), text: $input.caseData.saleTime)
                    TextField(language.text("admin.salePlatform"), text: $input.caseData.salePlatform)
                    TextField(language.text("admin.clientRegion"), text: $input.caseData.clientRegion)
                    TextField(language.text("admin.logisticsCost"), text: $input.caseData.logisticsCost)
                    TextField(language.text("admin.purchaseChannel"), text: $input.caseData.purchaseChannel)
                    TextField(language.text("admin.purchaseCost"), text: $input.caseData.purchaseCost)
                    TextField(language.text("admin.riskAdvice"), text: $input.caseData.riskAdvice, axis: .vertical)
                }

                if uploader.isUploading {
                    ProgressView(language.text("admin.uploadingImages"))
                }
                if let uploadError = uploader.uploadError {
                    Text(uploadError).foregroundStyle(.red)
                }
                if let validationError {
                    Text(validationError).foregroundStyle(.red)
                }
            }
            .navigationTitle(title)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(language.text("common.cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        if let validation = input.validate(
                            existingCollectionIDs: existingCollectionIDs,
                            currentArtworkId: seed?.id
                        ) {
                            validationError = validation
                            return
                        }
                        Task {
                            saving = true
                            validationError = nil
                            await onSave(input)
                            saving = false
                            dismiss()
                        }
                    } label: {
                        if saving { ProgressView() } else { Text(language.text("admin.save")) }
                    }
                    .disabled(saving || uploader.isUploading)
                }
            }
            .onChange(of: coverPickerItem) { item in
                guard let item else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let url = await uploader.upload(imageData: data, fileName: "cover.jpg") {
                        input.image = url
                        if input.galleryImagesText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            input.galleryImagesText = url
                        }
                    }
                }
            }
            .onChange(of: galleryPickerItems) { items in
                guard !items.isEmpty else { return }
                Task {
                    var urls: [String] = []
                    for item in items {
                        if let data = try? await item.loadTransferable(type: Data.self),
                           let url = await uploader.upload(imageData: data, fileName: "gallery.jpg") {
                            urls.append(url)
                        }
                    }
                    if !urls.isEmpty {
                        let existing = input.galleryImagesText.trimmingCharacters(in: .whitespacesAndNewlines)
                        if existing.isEmpty {
                            input.galleryImagesText = urls.joined(separator: "\n")
                        } else {
                            input.galleryImagesText = existing + "\n" + urls.joined(separator: "\n")
                        }
                    }
                    galleryPickerItems = []
                }
            }
            .onAppear {
                guard let seed else { return }
                input.title = seed.title
                input.titleZh = seed.titleZh ?? ""
                input.category = seed.category
                input.categoryZh = seed.categoryZh ?? ""
                input.period = seed.period
                input.periodZh = seed.periodZh ?? ""
                input.image = seed.image
                input.galleryImagesText = seed.galleryImages?.joined(separator: "\n") ?? seed.image
                input.description = seed.description
                input.descriptionZh = seed.descriptionZh ?? ""
                input.listingType = seed.listingType
                input.isForSale = seed.isForSale ?? false
                if let price = seed.price { input.price = String(format: "%.0f", price) }
                input.currency = seed.currency ?? "CNY"
                input.collectionId = seed.collectionId ?? ""

                if let c = seed.caseRecord {
                    input.caseData.caseId = c.caseId
                    input.caseData.salePrice = c.salePrice
                    input.caseData.saleTime = c.saleTime
                    input.caseData.salePlatform = c.salePlatform
                    input.caseData.clientRegion = c.clientRegion
                    input.caseData.logisticsCost = c.logisticsCost
                    input.caseData.purchaseChannel = c.purchaseChannel
                    input.caseData.purchaseCost = c.purchaseCost
                    input.caseData.riskAdvice = c.riskAdvice
                }
            }
        }
    }

    private func generateCollectionID() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMddyy"
        let date = formatter.string(from: Date())
        let letters = String((0..<2).map { _ in "ABCDEFGHIJKLMNOPQRSTUVWXYZ".randomElement()! })
        let digits = String(Int.random(in: 10...99))
        return "COL-\(date)-\(letters)\(digits)"
    }
}
