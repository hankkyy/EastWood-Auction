import PhotosUI
import SwiftUI
import UIKit

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
    var category = ""
    var period = ""
    var image = ""
    var galleryImagesText = ""
    var description = ""
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
            return "Title is required."
        }
        if category.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Category is required."
        }
        if period.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Period is required."
        }
        if !image.lowercased().hasPrefix("http") {
            return "Cover image must be a valid URL."
        }
        if description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Description is required."
        }
        if listingType == "collection" && collectionId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Collection listing requires Collection ID."
        }
        let normalizedCollectionId = collectionId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !normalizedCollectionId.isEmpty {
            let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789-_")
            if normalizedCollectionId.rangeOfCharacter(from: allowed.inverted) != nil {
                return "Collection ID can use only a-z, 0-9, hyphen, underscore."
            }
            let conflict = existingCollectionIDs.contains(normalizedCollectionId)
            if conflict {
                return "Collection ID already exists. Please use a unique value."
            }
        }
        if isForSale {
            guard let p = Double(price), p > 0 else {
                return "Price must be a positive number when item is for sale."
            }
        }
        if caseData.isEnabled {
            if caseData.salePrice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return "Case record requires Sale Price."
            }
            if caseData.saleTime.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return "Case record requires Sale Time."
            }
            if caseData.salePlatform.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return "Case record requires Sale Platform."
            }
        }
        for url in galleryImages where !url.lowercased().hasPrefix("http") {
            return "All gallery image entries must be valid URLs."
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
            errorMessage = "Failed to load artworks"
        }
    }

    func create(input: AdminArtworkInput, token: String) async -> Bool {
        let result = await createWithResult(input: input, token: token)
        return result.success
    }

    func createWithResult(input: AdminArtworkInput, token: String) async -> ImportResult {
        guard let base = AppConfig.webAppURL else {
            return ImportResult(success: false, message: "Invalid app base URL.")
        }
        do {
            let priceValue = Double(input.price)
            var artwork: [String: Any] = [
                "id": UUID().uuidString,
                "title": input.title,
                "category": input.category,
                "period": input.period,
                "image": input.image,
                "galleryImages": input.galleryImages,
                "description": input.description,
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
                return ImportResult(success: false, message: "Invalid server response.")
            }
            if http.statusCode == 401 || http.statusCode == 403 {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
                return ImportResult(success: false, message: "Unauthorized.")
            }
            guard (200...299).contains(http.statusCode) else {
                if let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let error = payload["error"] as? String,
                   !error.isEmpty {
                    return ImportResult(success: false, message: error)
                }
                return ImportResult(success: false, message: "Request failed: \(http.statusCode)")
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
                "category": input.category,
                "period": input.period,
                "image": input.image,
                "galleryImages": input.galleryImages,
                "description": input.description,
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
            uploadError = "Invalid image"
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
            uploadError = "Upload failed"
            return nil
        }
    }
}

struct NativeAdminArtworksView: View {
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

    var body: some View {
        Group {
            if !auth.isAdmin {
                VStack(spacing: 8) {
                    Text("Admin access required")
                        .font(.headline)
                    Text("Current account does not have administrator permission.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding()
            } else {
                List {
                    Section {
                        TextField("Search artworks", text: $query)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                            .eastwoodInput()

                        Picker("Type", selection: $listingFilter) {
                            Text("All").tag("all")
                            Text("Product").tag("product")
                            Text("Collection").tag("collection")
                            Text("Case").tag("case")
                        }
                        .pickerStyle(.segmented)

                        HStack {
                            Picker("Sale", selection: $saleFilter) {
                                Text("Sale: All").tag("all")
                                Text("For Sale").tag("forSale")
                                Text("Not For Sale").tag("notForSale")
                            }
                            .pickerStyle(.menu)

                            Picker("Price", selection: $priceFilter) {
                                Text("Price: All").tag("all")
                                Text("< 1,000").tag("under1k")
                                Text("1,000-5,000").tag("1kTo5k")
                                Text("> 5,000").tag("above5k")
                            }
                            .pickerStyle(.menu)
                        }

                        Picker("Case", selection: $caseFilter) {
                            Text("Case: All").tag("all")
                            Text("Has Case").tag("hasCase")
                            Text("No Case").tag("noCase")
                        }
                        .pickerStyle(.segmented)
                    }

                    if manager.isLoading { ProgressView() }
                    if let error = manager.errorMessage {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(error).foregroundStyle(.red)
                            Button("Retry") { Task { await manager.load() } }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                        }
                    }

                    if !manager.isLoading && manager.errorMessage == nil && filteredArtworks.isEmpty {
                        Text("No artworks found for current filter.")
                            .foregroundStyle(.secondary)
                    }

                    ForEach(filteredArtworks) { artwork in
                        HStack {
                            if selectionMode {
                                Image(systemName: selectedIds.contains(artwork.id) ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(selectedIds.contains(artwork.id) ? .green : .secondary)
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                Text(artwork.localizedTitle).font(.headline)
                                Text("\(artwork.category) · \(artwork.period)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if !selectionMode {
                                Button { editingArtwork = artwork } label: { Image(systemName: "pencil") }
                                    .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })

                                Button(role: .destructive) {
                                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                    Task { _ = await manager.delete(artworkId: artwork.id, token: auth.accessToken) }
                                } label: {
                                    Image(systemName: "trash")
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                            }
                        }
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
            }
        }
        .navigationTitle("Admin Artworks")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(selectionMode ? "Done" : "Select") {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    selectionMode.toggle()
                    if !selectionMode {
                        selectedIds.removeAll()
                    }
                }
                .disabled(!auth.isAdmin || manager.isLoading || filteredArtworks.isEmpty)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { creating = true } label: { Image(systemName: "plus") }
                    .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                    .disabled(!auth.isAdmin || manager.isLoading || selectionMode)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { batchImporting = true } label: { Image(systemName: "square.and.arrow.down.on.square") }
                    .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                    .disabled(!auth.isAdmin || manager.isLoading || selectionMode)
            }
            ToolbarItem(placement: .bottomBar) {
                if selectionMode {
                    Button(role: .destructive) {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        Task {
                            let ids = selectedIds
                            for id in ids {
                                _ = await manager.delete(artworkId: id, token: auth.accessToken)
                            }
                            selectedIds.removeAll()
                            selectionMode = false
                        }
                    } label: {
                        Text("Delete Selected (\(selectedIds.count))")
                    }
                    .disabled(selectedIds.isEmpty)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(EastwoodBackground())
        .task { await manager.load() }
        .refreshable { await manager.load() }
        .sheet(isPresented: $creating) {
            AdminArtworkEditor(
                title: "Create Artwork",
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
                title: "Edit Artwork",
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
                            let reason = result.message ?? "Unknown error"
                            failures.append("\(item.title): \(reason)")
                        }
                    }

                    importReportTitle = "Imported \(successCount) / \(items.count)"
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
    }
}

private struct ImportReportView: View {
    let title: String
    let successCount: Int
    let totalCount: Int
    let failures: [String]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("Summary") {
                    HStack {
                        Text("Imported")
                        Spacer()
                        Text("\(successCount) / \(totalCount)")
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Failed")
                        Spacer()
                        Text("\(failures.count)")
                            .foregroundColor(failures.isEmpty ? .secondary : .red)
                    }
                }

                Section("Failure Details") {
                    if failures.isEmpty {
                        Text("All rows imported successfully.")
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
            .navigationTitle("Import Report")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

private struct AdminBatchImportView: View {
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
                Section("Input Format") {
                    Text("One line per artwork: title|imageUrl|description|price(optional)|collectionId(optional)|currency(optional)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    TextField("Example line...", text: $rowsText, axis: .vertical)
                        .lineLimit(8...14)
                }

                Section("Shared Fields") {
                    Picker("Listing Type", selection: $listingType) {
                        Text("product").tag("product")
                        Text("collection").tag("collection")
                    }
                    TextField("Category", text: $category)
                    TextField("Period", text: $period)
                }

                Section("Validation") {
                    Text("Valid rows: \(parsedPreview.count)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Toggle("Import valid rows only (skip invalid)", isOn: $importValidOnly)
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
            .navigationTitle("Batch Import")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Import") {
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

        let lines = rowsText
            .split(whereSeparator: \.isNewline)
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        for (idx, line) in lines.enumerated() {
                let parts = line.split(separator: "|").map(String.init)
                guard parts.count >= 3 else {
                    errors.append("Line \(idx + 1): expected title|imageUrl|description|price(optional)|collectionId(optional)|currency(optional)")
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
                }
                if parts.count > 5 {
                    let c = parts[5].trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    if c == "USD" || c == "CNY" {
                        input.currency = c
                    } else if !c.isEmpty {
                        errors.append("Line \(idx + 1): currency must be USD or CNY.")
                        continue
                    }
                }
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
                Section("Basic") {
                    TextField("Title", text: $input.title)
                    TextField("Category", text: $input.category)
                    TextField("Period", text: $input.period)
                    TextField("Cover Image URL", text: $input.image)
                    TextField("Description", text: $input.description, axis: .vertical)

                    PhotosPicker(selection: $coverPickerItem, matching: .images) {
                        Label("Upload Cover", systemImage: "photo")
                    }
                }

                Section("Listing") {
                    Picker("Listing Type", selection: $input.listingType) {
                        Text("product").tag("product")
                        Text("collection").tag("collection")
                    }
                    Toggle("For Sale", isOn: $input.isForSale)
                    TextField("Price", text: $input.price)
                        .keyboardType(.decimalPad)
                    Picker("Currency", selection: $input.currency) {
                        Text("CNY").tag("CNY")
                        Text("USD").tag("USD")
                    }
                    TextField("Collection ID", text: $input.collectionId)
                    Button("Auto Generate Collection ID") {
                        input.collectionId = generateCollectionID()
                    }
                    .buttonStyle(.bordered)
                }

                Section("Gallery URLs (one per line)") {
                    TextField("https://...", text: $input.galleryImagesText, axis: .vertical)
                        .lineLimit(4...8)

                    PhotosPicker(selection: $galleryPickerItems, matching: .images) {
                        Label("Upload Gallery Images", systemImage: "photo.stack")
                    }
                }

                Section("Case Record (optional)") {
                    TextField("Case ID", text: $input.caseData.caseId)
                    TextField("Sale Price", text: $input.caseData.salePrice)
                    TextField("Sale Time", text: $input.caseData.saleTime)
                    TextField("Sale Platform", text: $input.caseData.salePlatform)
                    TextField("Client Region", text: $input.caseData.clientRegion)
                    TextField("Logistics Cost", text: $input.caseData.logisticsCost)
                    TextField("Purchase Channel", text: $input.caseData.purchaseChannel)
                    TextField("Purchase Cost", text: $input.caseData.purchaseCost)
                    TextField("Risk Advice", text: $input.caseData.riskAdvice, axis: .vertical)
                }

                if uploader.isUploading {
                    ProgressView("Uploading images...")
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
                    Button("Cancel") { dismiss() }
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
                        }
                    } label: {
                        if saving { ProgressView() } else { Text("Save") }
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
                input.category = seed.category
                input.period = seed.period
                input.image = seed.image
                input.galleryImagesText = seed.galleryImages?.joined(separator: "\n") ?? seed.image
                input.description = seed.description
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
        let prefix = input.category
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: " ", with: "-")
        let normalizedPrefix = prefix.isEmpty ? "item" : prefix
        return "\(normalizedPrefix)-\(Int(Date().timeIntervalSince1970))"
    }
}
