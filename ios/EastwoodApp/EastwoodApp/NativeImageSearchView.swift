import PhotosUI
import SwiftUI
import UIKit

private struct ImageDiagnostics {
    let brightness: Double
    let contrast: Double
    let sharpness: Double
}

struct NativeImageSearchView: View {
    @StateObject private var service = NativeImageSearchService()
    @State private var pickerItem: PhotosPickerItem?
    @State private var selectedImage: UIImage?
    @State private var threshold: Double = 0.6
    @State private var matchCount: Double = 20
    @State private var selectedArtwork: NativeArtwork?
    @State private var diagnostics: ImageDiagnostics?

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        let pagePad = EastwoodLayout.pagePadding(for: pageWidth)
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Visual Search")
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundStyle(EastwoodTheme.goldSoft)
                        Text("Upload a photo and discover similar antiques from the Eastwood catalog.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .eastwoodPanel()

                    if let selectedImage {
                        Image(uiImage: selectedImage)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 260)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    } else {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.white.opacity(0.08))
                            .frame(height: EastwoodLayout.cardImageHeight(for: pageWidth) + 20)
                            .overlay(Text("Select an image to search").foregroundStyle(.secondary))
                    }

                    HStack(spacing: 10) {
                        PhotosPicker(selection: $pickerItem, matching: .images) {
                            Label("Choose Image", systemImage: "photo")
                        }
                        .buttonStyle(EastwoodSecondaryButtonStyle())

                        Button {
                            guard let selectedImage else { return }
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            Task {
                                await service.runSearch(
                                    image: selectedImage,
                                    threshold: threshold,
                                    matchCount: Int(matchCount.rounded())
                                )
                            }
                        } label: {
                            if service.isSearching { ProgressView() } else { Text("Search") }
                        }
                        .buttonStyle(EastwoodPrimaryButtonStyle())
                        .disabled(selectedImage == nil || service.isSearching)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Match Threshold: \(String(format: "%.2f", threshold))")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Slider(value: $threshold, in: 0.2...0.95, step: 0.05)

                        Text("Result Count: \(Int(matchCount.rounded()))")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Slider(value: $matchCount, in: 5...30, step: 1)
                    }
                    .padding(10)
                    .eastwoodPanel()

                    if let error = service.errorMessage {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(error).font(.footnote).foregroundStyle(.red)
                            if let selectedImage {
                                Button("Retry") {
                                    Task {
                                        await service.runSearch(
                                            image: selectedImage,
                                            threshold: threshold,
                                            matchCount: Int(matchCount.rounded())
                                        )
                                    }
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                            }
                        }
                    }

                    if !service.isSearching && service.errorMessage == nil && selectedImage != nil && service.matches.isEmpty {
                        VStack(spacing: 6) {
                            Text("No matches found").font(.subheadline.weight(.semibold))
                            Text("Try lowering threshold or selecting a clearer image.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        .padding(10)
                        .eastwoodPanel()
                    }

                    if !service.matches.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Effective threshold: \(String(format: "%.2f", service.lastThreshold))")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            Text("Returned results: \(service.totalCandidates)")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            if let url = service.uploadedImageURL, !url.isEmpty {
                                Text("Cloud query image uploaded")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if let diagnostics {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Image Analysis")
                                .font(.headline)
                            metricRow("Brightness", diagnostics.brightness)
                            metricRow("Contrast", diagnostics.contrast)
                            metricRow("Sharpness", diagnostics.sharpness)
                            Text(recommendation(for: diagnostics))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        .padding(10)
                        .eastwoodPanel()
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Knowledge Base Snapshot")
                            .font(.headline)
                        statRow("Total Items", service.knowledgeTotal)
                        statRow("Product Items", service.knowledgeProducts)
                        statRow("Collection Items", service.knowledgeCollections)
                        statRow("Case Records", service.knowledgeCases)
                    }
                    .padding(10)
                    .eastwoodPanel()

                    LazyVStack(spacing: 12) {
                        ForEach(service.matches) { match in
                            HStack(spacing: 10) {
                                AsyncImage(url: URL(string: match.artwork.image)) { phase in
                                    switch phase {
                                    case .success(let image): image.resizable().scaledToFill()
                                    default: Color.white.opacity(0.08)
                                    }
                                }
                                .frame(width: 72, height: 72)
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(match.artwork.titleZh?.isEmpty == false ? match.artwork.titleZh! : match.artwork.title)
                                        .font(.headline)
                                        .lineLimit(1)
                                    Text(match.artwork.category)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Text(String(format: "Similarity %.1f%%", match.similarity * 100))
                                        .font(.caption)
                                        .foregroundStyle(Color(red: 0.93, green: 0.78, blue: 0.38))
                                }

                                Spacer()
                            }
                            .padding(10)
                            .eastwoodPanel()
                            .contentShape(Rectangle())
                            .onTapGesture {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                selectedArtwork = toNativeArtwork(match)
                            }
                        }
                    }
                }
                .padding(pagePad)
            }
            .navigationTitle("Image Search")
            .sheet(item: $selectedArtwork) { artwork in
                NativeArtworkDetailView(artwork: artwork)
            }
            .task {
                await service.refreshKnowledgeStats()
            }
            .background(EastwoodBackground())
            .eastwoodEnterMotion(id: "image-search-page")
            .onChange(of: pickerItem) { newValue in
                guard let newValue else { return }
                Task {
                    if let data = try? await newValue.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        selectedImage = image
                        diagnostics = analyze(image: image)
                    }
                }
            }
        }
    }

    private func metricRow(_ title: String, _ value: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title).font(.caption)
                Spacer()
                Text("\(Int((value * 100).rounded()))%")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.08))
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(red: 0.93, green: 0.78, blue: 0.38))
                        .frame(width: geo.size.width * max(0.0, min(1.0, value)))
                }
            }
            .frame(height: 8)
        }
    }

    private func statRow(_ title: String, _ value: Int) -> some View {
        HStack {
            Text(title)
                .font(.caption)
            Spacer()
            Text("\(value)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }

    private func recommendation(for d: ImageDiagnostics) -> String {
        if d.sharpness < 0.15 {
            return "Photo appears blurry. Move closer and keep the camera steady for better matches."
        }
        if d.contrast < 0.18 {
            return "Photo contrast is low. Improve lighting or avoid strong glare."
        }
        if d.brightness < 0.22 {
            return "Image is dark. Increase lighting or exposure for stronger matching."
        }
        return "Image quality looks good for visual matching."
    }

    private func analyze(image: UIImage) -> ImageDiagnostics {
        guard let cg = image.cgImage else {
            return ImageDiagnostics(brightness: 0.5, contrast: 0.5, sharpness: 0.5)
        }

        let width = max(8, min(64, cg.width))
        let height = max(8, min(64, cg.height))
        let bytesPerPixel = 4
        let bytesPerRow = bytesPerPixel * width
        var pixels = [UInt8](repeating: 0, count: width * height * bytesPerPixel)

        guard let ctx = CGContext(
            data: &pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return ImageDiagnostics(brightness: 0.5, contrast: 0.5, sharpness: 0.5)
        }

        ctx.interpolationQuality = .low
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))

        var lumas: [Double] = []
        lumas.reserveCapacity(width * height)
        for i in stride(from: 0, to: pixels.count, by: 4) {
            let r = Double(pixels[i]) / 255.0
            let g = Double(pixels[i + 1]) / 255.0
            let b = Double(pixels[i + 2]) / 255.0
            let y = 0.2126 * r + 0.7152 * g + 0.0722 * b
            lumas.append(y)
        }

        let mean = lumas.reduce(0, +) / Double(max(1, lumas.count))
        let variance = lumas.reduce(0) { $0 + pow($1 - mean, 2) } / Double(max(1, lumas.count))
        let contrast = min(1.0, sqrt(variance) * 3.2)

        var edgeSum = 0.0
        if width > 2 && height > 2 {
            for y in 1..<(height - 1) {
                for x in 1..<(width - 1) {
                    let i = y * width + x
                    let gx = abs(lumas[i + 1] - lumas[i - 1])
                    let gy = abs(lumas[i + width] - lumas[i - width])
                    edgeSum += gx + gy
                }
            }
        }
        let edgeNorm = edgeSum / Double(max(1, (width - 2) * (height - 2)))
        let sharpness = min(1.0, edgeNorm * 4.0)

        return ImageDiagnostics(
            brightness: max(0.0, min(1.0, mean)),
            contrast: max(0.0, min(1.0, contrast)),
            sharpness: max(0.0, min(1.0, sharpness))
        )
    }

    private func toNativeArtwork(_ match: NativeImageMatch) -> NativeArtwork {
        NativeArtwork(
            id: match.artwork.id,
            title: match.artwork.title,
            titleZh: match.artwork.titleZh,
            descriptionZh: nil,
            category: match.artwork.category,
            categoryZh: nil,
            period: match.artwork.period,
            periodZh: nil,
            image: match.artwork.image,
            galleryImages: match.artwork.galleryImages ?? [match.artwork.image],
            description: match.artwork.description,
            listingType: match.artwork.listingType ?? "product",
            featureVector: match.artwork.featureVector ?? [0, 0, 0, 0, 0, 0, 0, 0],
            isForSale: match.artwork.isForSale,
            price: match.artwork.price,
            currency: match.artwork.currency,
            caseRecord: match.artwork.caseRecord,
            collectionId: match.artwork.collectionId,
            uploadedBy: nil,
            isOfficial: nil
        )
    }
}
