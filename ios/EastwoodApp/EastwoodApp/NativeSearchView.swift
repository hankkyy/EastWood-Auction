import SwiftUI

// MARK: - Search Filters

private enum SearchTypeFilter: String, CaseIterable, Identifiable {
    case all, collections, shop, cases
    var id: String { rawValue }
}

private enum SearchSaleFilter: String, CaseIterable, Identifiable {
    case all, forSale, notForSale
    var id: String { rawValue }
}

// MARK: - Search View

struct NativeSearchView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    @State private var query = ""
    @State private var typeFilter: SearchTypeFilter = .all
    @State private var categoryFilter: String = "all"
    @State private var saleFilter: SearchSaleFilter = .all

    // MARK: - Filters

    private var categories: [String] {
        var cats = Set(artworks.map { $0.category }.filter { !$0.isEmpty })
        cats.formUnion(artworks.compactMap { $0.categoryZh }.filter { !$0.isEmpty })
        return ["all"] + cats.sorted()
    }

    private var filtered: [NativeArtwork] {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        // Keyword search across all fields (matching web's 15+ field search)
        let keywordFiltered: [NativeArtwork]
        if text.isEmpty {
            keywordFiltered = artworks
        } else {
            keywordFiltered = artworks.filter {
                $0.title.lowercased().contains(text) ||
                ($0.titleZh ?? "").lowercased().contains(text) ||
                $0.category.lowercased().contains(text) ||
                ($0.categoryZh ?? "").lowercased().contains(text) ||
                $0.period.lowercased().contains(text) ||
                ($0.periodZh ?? "").lowercased().contains(text) ||
                $0.description.lowercased().contains(text) ||
                ($0.descriptionZh ?? "").lowercased().contains(text) ||
                ($0.collectionId ?? "").lowercased().contains(text) ||
                ($0.uploadedBy ?? "").lowercased().contains(text) ||
                $0.listingType.lowercased().contains(text) ||
                ($0.caseRecord?.caseId ?? "").lowercased().contains(text) ||
                ($0.caseRecord?.salePlatform ?? "").lowercased().contains(text) ||
                ($0.caseRecord?.clientRegion ?? "").lowercased().contains(text) ||
                ($0.caseRecord?.riskAdvice ?? "").lowercased().contains(text)
            }
        }

        // Type filter
        let typeFiltered: [NativeArtwork]
        switch typeFilter {
        case .all:
            typeFiltered = keywordFiltered
        case .collections:
            typeFiltered = keywordFiltered.filter { $0.listingType == "collection" && $0.caseRecord == nil }
        case .shop:
            typeFiltered = keywordFiltered.filter { $0.listingType == "product" || $0.isForSale == true }
        case .cases:
            typeFiltered = keywordFiltered.filter { $0.caseRecord != nil }
        }

        // Category filter
        let catFiltered: [NativeArtwork]
        if categoryFilter == "all" {
            catFiltered = typeFiltered
        } else {
            catFiltered = typeFiltered.filter {
                $0.category == categoryFilter ||
                $0.categoryZh == categoryFilter
            }
        }

        // Sale filter
        switch saleFilter {
        case .all:
            return catFiltered
        case .forSale:
            return catFiltered.filter { $0.isForSale == true }
        case .notForSale:
            return catFiltered.filter { $0.isForSale != true }
        }
    }

    // MARK: - Route helper (matches web's type-based routing)

    private func detailRoute(for artwork: NativeArtwork) -> some View {
        NativeArtworkDetailView(artwork: artwork)
    }

    // MARK: - Body

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        VStack(spacing: 0) {
            // Filter bar
            filterBar
                .padding(.horizontal, pad)
                .padding(.top, 8).padding(.bottom, 4)

            // Result count
            HStack {
                Text(resultCountText)
                    .font(.caption).foregroundStyle(.secondary)
                Spacer()
            }
            .padding(.horizontal, pad).padding(.vertical, 6)

            // Results
            if filtered.isEmpty {
                EastwoodStateView(
                    systemImage: "magnifyingglass",
                    title: language.text("search.title"),
                    message: language.language == .chinese
                        ? "没有找到匹配的藏品，试试其他筛选条件。"
                        : "No matching items found. Try different filters."
                )
                .padding(pad)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(filtered) { artwork in
                            NavigationLink(value: artwork) {
                                searchResultRow(artwork)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(pad)
                }
                .scrollIndicators(.hidden)
            }
        }
        .navigationTitle(language.text("search.title"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: NativeArtwork.self) {
            NativeArtworkDetailView(artwork: $0)
        }
        .searchable(text: $query, prompt: language.text("search.prompt"))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .eastwoodScreen()
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // Type filter
                Menu {
                    Picker("Type", selection: $typeFilter) {
                        Text(lang("全部类型","All Types")).tag(SearchTypeFilter.all)
                        Text(lang("藏品展示","Collection Display")).tag(SearchTypeFilter.collections)
                        Text(lang("古董商品","Shop Products")).tag(SearchTypeFilter.shop)
                        Text(lang("回流案例","Return Cases")).tag(SearchTypeFilter.cases)
                    }
                } label: {
                    filterChip(
                        label: typeFilterLabel,
                        icon: "line.3.horizontal.decrease.circle",
                        isActive: typeFilter != .all
                    )
                }

                // Category filter
                Menu {
                    Picker("Category", selection: $categoryFilter) {
                        Text(language.text("section.all")).tag("all")
                        ForEach(categories.filter { $0 != "all" }, id: \.self) { cat in
                            Text(displayCategoryName(cat)).tag(cat)
                        }
                    }
                } label: {
                    filterChip(
                        label: categoryFilter == "all" ? lang("分类","Category") : displayCategoryName(categoryFilter),
                        icon: "tag",
                        isActive: categoryFilter != "all"
                    )
                }

                // Sale filter
                Menu {
                    Picker("Sale", selection: $saleFilter) {
                        Text(lang("全部状态","All")).tag(SearchSaleFilter.all)
                        Text(language.text("artwork.forSale")).tag(SearchSaleFilter.forSale)
                        Text(language.text("artwork.notForSale")).tag(SearchSaleFilter.notForSale)
                    }
                } label: {
                    filterChip(
                        label: saleFilterLabel,
                        icon: "dollarsign.circle",
                        isActive: saleFilter != .all
                    )
                }
            }
        }
    }

    private func filterChip(label: String, icon: String, isActive: Bool) -> some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.caption)
            Text(label).font(.caption.weight(.medium)).lineLimit(1)
            Image(systemName: "chevron.down").font(.system(size: 8, weight: .bold))
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .foregroundStyle(isActive ? EastwoodTheme.goldDark : EastwoodTheme.mutedText)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(isActive ? EastwoodTheme.gold.opacity(0.10) : EastwoodTheme.panelSoft)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(isActive ? EastwoodTheme.gold.opacity(0.25) : EastwoodTheme.hairline, lineWidth: 0.5)
        )
    }

    // MARK: - Search Result Row (matches web card design)

    private func searchResultRow(_ artwork: NativeArtwork) -> some View {
        let isCase = artwork.caseRecord != nil
        let isShop = artwork.isForSale == true || artwork.listingType == "product"

        return VStack(spacing: 0) {
            // Image with gradient background (matching web)
            ZStack(alignment: .bottomLeading) {
                AsyncImage(url: artwork.imageURL) { phase in
                    switch phase {
                    case .success(let img): img.resizable().scaledToFill()
                    case .empty: Rectangle().fill(EastwoodTheme.panelSoft).overlay(ProgressView().tint(EastwoodTheme.gold))
                    case .failure: Rectangle().fill(EastwoodTheme.panelSoft).overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                    @unknown default: Rectangle().fill(EastwoodTheme.panelSoft)
                    }
                }
                .frame(height: 170).clipped()

                // Dark gradient overlay
                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.55)],
                    startPoint: .center, endPoint: .bottom
                )

                // Type badge + code on image
                HStack {
                    if isCase {
                        badge(lang("案例","Case"), color: .purple.opacity(0.85))
                    } else if isShop {
                        badge(lang("商品","Product"), color: .teal.opacity(0.85))
                    } else {
                        badge(lang("藏品","Collection"), color: .blue.opacity(0.85))
                    }
                    Spacer()
                    if let code = artwork.collectionId ?? artwork.caseRecord?.caseId {
                        Text(code).font(.system(size: 10, design: .monospaced)).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
                    }
                }
                .padding(10)
            }
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            // Info section
            VStack(alignment: .leading, spacing: 8) {
                Text(artwork.displayTitle(in: language.language))
                    .font(.subheadline.weight(.semibold)).foregroundStyle(EastwoodTheme.ink).lineLimit(2)

                HStack(spacing: 6) {
                    Text(artwork.displayCategory(in: language.language))
                        .font(.system(size: 10, weight: .semibold))
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(EastwoodTheme.gold.opacity(0.15), in: Capsule())
                        .foregroundStyle(EastwoodTheme.goldDark)
                    Text(artwork.displayPeriod(in: language.language))
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .padding(14)

            // "View details" button visual (NavigationLink at row level handles tap)
            Divider().opacity(0.5)
            HStack {
                Text(lang("查看详情","View details"))
                Spacer()
                Image(systemName: "arrow.right")
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 16).padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [EastwoodTheme.gold, EastwoodTheme.goldDark],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
        }
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(EastwoodTheme.panel))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 4, y: 2)
    }

    private func badge(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 9, weight: .bold))
            .padding(.horizontal, 6).padding(.vertical, 3)
            .background(color.opacity(0.12), in: Capsule())
            .foregroundStyle(color)
    }

    // MARK: - Helpers

    private var resultCountText: String {
        let count = filtered.count
        if language.language == .chinese {
            return "共 \(count) 条结果"
        }
        return "\(count) result\(count == 1 ? "" : "s")"
    }

    private var typeFilterLabel: String {
        switch typeFilter {
        case .all: return lang("全部类型","All Types")
        case .collections: return lang("藏品展示","Collections")
        case .shop: return lang("古董商品","Shop")
        case .cases: return lang("回流案例","Cases")
        }
    }

    private var saleFilterLabel: String {
        switch saleFilter {
        case .all: return lang("全部状态","All")
        case .forSale: return language.text("artwork.forSale")
        case .notForSale: return language.text("artwork.notForSale")
        }
    }

    private func displayCategoryName(_ cat: String) -> String {
        // Use same mapping as web's getCaseCategoryLabel
        if language.language == .chinese {
            switch cat.lowercased().trimmingCharacters(in: .whitespacesAndNewlines) {
            case "calligraphy", "字画": return "字画"
            case "porcelain", "瓷器": return "瓷器"
            case "jade", "翡翠玉器": return "翡翠玉器"
            case "bronze", "铜器": return "铜器"
            case "misc", "杂项": return "杂项"
            default: return cat
            }
        }
        return cat
    }

    private func lang(_ zh: String, _ en: String) -> String {
        language.language == .chinese ? zh : en
    }
}
