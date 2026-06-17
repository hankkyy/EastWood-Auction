import PhotosUI
import SwiftUI
import UIKit

private struct ImageDiagnostics {
    let brightness: Double
    let contrast: Double
    let sharpness: Double
}

struct NativeImageSearchView: View {
    @EnvironmentObject private var language: LanguageManager
    @StateObject private var service = NativeImageSearchService()
    @State private var pickerItem: PhotosPickerItem?
    @State private var selectedImage: UIImage?
    @State private var threshold: Double = 0.6
    @State private var matchCount: Double = 20
    @State private var selectedArtwork: NativeArtwork?
    @State private var diagnostics: ImageDiagnostics?

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 14) {
                // Hero
                HStack(spacing: 14) {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(EastwoodTheme.gold.opacity(0.12))
                        .frame(width: 56, height: 56)
                        .overlay(
                            Image(systemName: "camera.viewfinder")
                                .font(.title2.weight(.medium))
                                .foregroundStyle(EastwoodTheme.gold)
                        )
                    VStack(alignment: .leading, spacing: 4) {
                        Text(language.text("imageSearch.visualSearch"))
                            .font(.system(size: 24, weight: .bold, design: .serif))
                            .foregroundStyle(EastwoodTheme.ink)
                        Text(language.text("imageSearch.subtitle"))
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .eastwoodPanel()

                // Scope info
                VStack(alignment: .leading, spacing: 8) {
                    Text(language.text("imageSearch.scopeTitle")).font(.subheadline.weight(.semibold))
                    Text(language.text("imageSearch.scopeBody")).font(.caption).foregroundStyle(.secondary)
                    Divider().opacity(0.5)
                    Text(language.text("imageSearch.tipTitle")).font(.subheadline.weight(.semibold))
                    Text(language.text("imageSearch.tipBody")).font(.caption).foregroundStyle(.secondary)
                }
                .padding(14).eastwoodPanel()

                // Image picker area
                if let selectedImage {
                    Image(uiImage: selectedImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .eastwoodPanel()
                } else {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(EastwoodTheme.panelSoft)
                        .frame(height: 160)
                        .overlay(
                            VStack(spacing: 8) {
                                Image(systemName: "photo.on.rectangle.angled")
                                    .font(.system(size: 36)).foregroundStyle(EastwoodTheme.mutedText)
                                Text(language.text("imageSearch.selectImage"))
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(EastwoodTheme.hairline, lineWidth: 1)
                        )
                }

                // Actions
                HStack(spacing: 10) {
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        Label(language.text("imageSearch.chooseImage"), systemImage: "photo")
                    }
                    .buttonStyle(EastwoodSecondaryButtonStyle())

                    Button {
                        guard let selectedImage else { return }
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        Task { await service.runSearch(image: selectedImage, threshold: threshold, matchCount: Int(matchCount.rounded())) }
                    } label: {
                        if service.isSearching {
                            ProgressView().tint(.white)
                        } else {
                            Text(language.text("common.search"))
                        }
                    }
                    .buttonStyle(EastwoodPrimaryButtonStyle())
                    .disabled(selectedImage == nil || service.isSearching)
                }

                // Sliders
                VStack(alignment: .leading, spacing: 10) {
                    Text(language.format("imageSearch.threshold", String(format: "%.2f", threshold)))
                        .font(.caption).foregroundStyle(.secondary)
                    Slider(value: $threshold, in: 0.2...0.95, step: 0.05).tint(EastwoodTheme.gold)

                    Text(language.format("imageSearch.resultCount", String(Int(matchCount.rounded()))))
                        .font(.caption).foregroundStyle(.secondary)
                    Slider(value: $matchCount, in: 5...30, step: 1).tint(EastwoodTheme.gold)
                }
                .padding(14).eastwoodPanel()

                // Error
                if let error = service.errorMessage {
                    VStack(spacing: 8) {
                        Text(error).font(.footnote).foregroundStyle(EastwoodTheme.error)
                        if selectedImage != nil {
                            Button(language.text("common.retry")) {
                                Task { await service.runSearch(image: selectedImage!, threshold: threshold, matchCount: Int(matchCount.rounded())) }
                            }
                            .buttonStyle(EastwoodSecondaryButtonStyle())
                        }
                    }
                    .padding(12).eastwoodPanel()
                }

                // No matches
                if !service.isSearching && service.errorMessage == nil && selectedImage != nil && service.matches.isEmpty {
                    VStack(spacing: 6) {
                        Text(language.text("imageSearch.noMatches")).font(.subheadline.weight(.semibold))
                        Text(language.text("imageSearch.noMatches.message")).font(.footnote).foregroundStyle(.secondary)
                    }
                    .padding(16).frame(maxWidth: .infinity).eastwoodPanel()
                }

                // Stats
                if !service.matches.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(language.format("imageSearch.effectiveThreshold", String(format: "%.2f", service.lastThreshold)))
                            .font(.footnote).foregroundStyle(.secondary)
                        Text(language.format("imageSearch.returnedResults", String(service.totalCandidates)))
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    .padding(10).frame(maxWidth: .infinity, alignment: .leading).eastwoodPanel()
                }

                // Diagnostics
                if let diagnostics {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(language.text("imageSearch.analysis")).font(.subheadline.weight(.semibold))
                        metricBar(language.text("imageSearch.brightness"), diagnostics.brightness)
                        metricBar(language.text("imageSearch.contrast"), diagnostics.contrast)
                        metricBar(language.text("imageSearch.sharpness"), diagnostics.sharpness)
                        Text(recommendation(for: diagnostics)).font(.caption).foregroundStyle(.secondary)
                    }
                    .padding(14).eastwoodPanel()
                }

                // Knowledge base
                VStack(alignment: .leading, spacing: 8) {
                    Text(language.text("imageSearch.knowledge")).font(.subheadline.weight(.semibold))
                    Text(language.text("imageSearch.snapshotNote")).font(.caption).foregroundStyle(.secondary)
                    statRow(language.text("imageSearch.totalItems"), service.knowledgeTotal, accent: EastwoodTheme.gold)
                    statRow(language.text("imageSearch.productItems"), service.knowledgeProducts, accent: EastwoodTheme.shopAccent)
                    statRow(language.text("imageSearch.collectionItems"), service.knowledgeCollections, accent: EastwoodTheme.collectionsAccent)
                    statRow(language.text("imageSearch.caseRecords"), service.knowledgeCases, accent: EastwoodTheme.casesAccent)
                }
                .padding(14).eastwoodPanel()

                // Results
                ForEach(service.matches) { match in
                    matchRow(match)
                }
            }
            .padding(pad)
        }
        .navigationTitle(language.text("imageSearch.title"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .sheet(item: $selectedArtwork) { NativeArtworkDetailView(artwork: $0) }
        .task { await service.refreshKnowledgeStats() }
        .eastwoodScreen()
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

    // MARK: - Components

    private func metricBar(_ title: String, _ value: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title).font(.caption)
                Spacer()
                Text("\(Int((value * 100).rounded()))%").font(.caption).foregroundStyle(.secondary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4).fill(Color.black.opacity(0.06))
                    RoundedRectangle(cornerRadius: 4)
                        .fill(EastwoodTheme.gold)
                        .frame(width: geo.size.width * max(0.0, min(1.0, value)))
                }
            }
            .frame(height: 6)
        }
    }

    private func statRow(_ title: String, _ value: Int, accent: Color) -> some View {
        HStack {
            Circle().fill(accent).frame(width: 8, height: 8)
            Text(title).font(.caption)
            Spacer()
            Text("\(value)").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
        }
    }

    private func matchRow(_ match: NativeImageMatch) -> some View {
        let similarity = String(format: "%.1f%%", match.similarity * 100)
        return Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            selectedArtwork = toNativeArtwork(match)
        } label: {
            HStack(spacing: 12) {
                AsyncImage(url: URL(string: match.artwork.image)) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        EastwoodTheme.panelSoft
                    }
                }
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text(match.artwork.displayTitle(in: language.language))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(EastwoodTheme.ink).lineLimit(2)
                    HStack(spacing: 4) {
                        Text(match.artwork.displayCategory(in: language.language))
                            .font(.caption).foregroundStyle(.secondary)
                        Text("•").font(.caption).foregroundStyle(.secondary)
                        Text(match.artwork.displayPeriod(in: language.language))
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text(similarity)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(EastwoodTheme.goldDark)
                    Text(language.text("imageSearch.match"))
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            .padding(12)
        }
        .buttonStyle(.plain)
        .eastwoodPanel()
    }

    private func recommendation(for d: ImageDiagnostics) -> String {
        if d.sharpness < 0.15 { return language.text("imageSearch.recommend.blur") }
        if d.contrast < 0.18 { return language.text("imageSearch.recommend.contrast") }
        if d.brightness < 0.22 { return language.text("imageSearch.recommend.dark") }
        return language.text("imageSearch.recommend.good")
    }

    private func analyze(image: UIImage) -> ImageDiagnostics {
        guard let cg = image.cgImage else {
            return ImageDiagnostics(brightness: 0.5, contrast: 0.5, sharpness: 0.5)
        }
        let width = max(8, min(64, cg.width))
        let height = max(8, min(64, cg.height))
        let bpp = 4; let bpr = bpp * width
        var pixels = [UInt8](repeating: 0, count: width * height * bpp)

        guard let ctx = CGContext(data: &pixels, width: width, height: height,
                                   bitsPerComponent: 8, bytesPerRow: bpr,
                                   space: CGColorSpaceCreateDeviceRGB(),
                                   bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return ImageDiagnostics(brightness: 0.5, contrast: 0.5, sharpness: 0.5) }

        ctx.interpolationQuality = .low
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))

        var lumas: [Double] = []; lumas.reserveCapacity(width * height)
        for i in stride(from: 0, to: pixels.count, by: 4) {
            let r = Double(pixels[i]) / 255, g = Double(pixels[i+1]) / 255, b = Double(pixels[i+2]) / 255
            lumas.append(0.2126 * r + 0.7152 * g + 0.0722 * b)
        }

        let mean = lumas.reduce(0, +) / Double(max(1, lumas.count))
        let variance = lumas.reduce(0) { $0 + pow($1 - mean, 2) } / Double(max(1, lumas.count))
        let contrast = min(1.0, sqrt(variance) * 3.2)

        var edge = 0.0
        if width > 2 && height > 2 {
            for y in 1..<(height-1) {
                for x in 1..<(width-1) {
                    let i = y * width + x
                    edge += abs(lumas[i+1] - lumas[i-1]) + abs(lumas[i+width] - lumas[i-width])
                }
            }
        }
        let sharpness = min(1.0, (edge / Double(max(1, (width-2)*(height-2)))) * 4.0)

        return ImageDiagnostics(brightness: max(0, min(1, mean)),
                                 contrast: max(0, min(1, contrast)),
                                 sharpness: max(0, min(1, sharpness)))
    }

    private func toNativeArtwork(_ match: NativeImageMatch) -> NativeArtwork {
        NativeArtwork(id: match.artwork.id, title: match.artwork.title,
                       titleZh: match.artwork.titleZh, descriptionZh: nil,
                       category: match.artwork.category, categoryZh: nil,
                       period: match.artwork.period, periodZh: nil,
                       image: match.artwork.image,
                       galleryImages: match.artwork.galleryImages ?? [match.artwork.image],
                       description: match.artwork.description,
                       listingType: match.artwork.listingType ?? "product",
                       featureVector: match.artwork.featureVector ?? [0,0,0,0,0,0,0,0],
                       isForSale: match.artwork.isForSale, price: match.artwork.price,
                       currency: match.artwork.currency, caseRecord: match.artwork.caseRecord,
                       collectionId: match.artwork.collectionId, uploadedBy: nil, isOfficial: nil)
    }
}
