import SwiftUI
import UIKit

enum NativeSectionKind: String, CaseIterable, Identifiable {
    case collections
    case shop
    case cases

    var id: String { rawValue }

    var title: String {
        switch self {
        case .collections: return "Collections"
        case .shop: return "Antique Shop"
        case .cases: return "Return Cases"
        }
    }
}

private enum SectionSort: String, CaseIterable, Identifiable {
    case newest = "Newest"
    case titleAZ = "Title A-Z"

    var id: String { rawValue }
}

private enum ShopPriceRange: String, CaseIterable, Identifiable {
    case all = "All"
    case under1k = "< 1,000"
    case from1kTo5k = "1,000 - 5,000"
    case above5k = "> 5,000"

    var id: String { rawValue }
}

struct NativeSectionView: View {
    let kind: NativeSectionKind
    let artworks: [NativeArtwork]

    @State private var sort: SectionSort = .newest
    @State private var query = ""
    @State private var onlyForSale = true
    @State private var priceRange: ShopPriceRange = .all
    @State private var selectedCategory = "All"
    @State private var selectedPeriod = "All"

    private var categories: [String] {
        let set = Set(baseItems.map(\.category).filter { !$0.isEmpty })
        return ["All"] + set.sorted()
    }

    private var periods: [String] {
        let set = Set(baseItems.map(\.period).filter { !$0.isEmpty })
        return ["All"] + set.sorted()
    }

    private var baseItems: [NativeArtwork] {
        switch kind {
        case .collections:
            return artworks.filter { $0.listingType == "collection" }
        case .shop:
            return artworks.filter { $0.listingType == "product" || $0.isForSale == true }
        case .cases:
            return artworks.filter { $0.caseRecord != nil }
        }
    }

    private var filtered: [NativeArtwork] {
        let keyword = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        var searched = keyword.isEmpty ? baseItems : baseItems.filter {
            $0.title.lowercased().contains(keyword)
            || ($0.titleZh ?? "").lowercased().contains(keyword)
            || $0.category.lowercased().contains(keyword)
            || $0.period.lowercased().contains(keyword)
        }
        if selectedCategory != "All" {
            searched = searched.filter { $0.category == selectedCategory }
        }
        if selectedPeriod != "All" {
            searched = searched.filter { $0.period == selectedPeriod }
        }

        if kind == .shop {
            if onlyForSale {
                searched = searched.filter { $0.isForSale == true }
            }

            switch priceRange {
            case .all:
                break
            case .under1k:
                searched = searched.filter { ($0.price ?? .infinity) < 1000 }
            case .from1kTo5k:
                searched = searched.filter { value in
                    let p = value.price ?? -1
                    return p >= 1000 && p <= 5000
                }
            case .above5k:
                searched = searched.filter { ($0.price ?? -1) > 5000 }
            }
        }

        switch sort {
        case .newest:
            return searched
        case .titleAZ:
            return searched.sorted { $0.localizedTitle.localizedCaseInsensitiveCompare($1.localizedTitle) == .orderedAscending }
        }
    }

    var body: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 12) {
                sectionHero
                controls

                HStack {
                    Text("Curated List")
                        .font(.title3.weight(.semibold))
                    Spacer()
                    Text("\(filtered.count) items")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, pagePad)

                LazyVStack(spacing: 12) {
                    ForEach(filtered) { artwork in
                        NavigationLink(value: artwork) {
                            NativeArtworkCard(artwork: artwork)
                        }
                        .buttonStyle(.plain)
                        .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                    }
                }
                .padding(pagePad)
            }
        }
        .scrollIndicators(.hidden)
        .animation(EastwoodMotion.listUpdate, value: filtered.count)
        .navigationTitle(kind.title)
        .navigationDestination(for: NativeArtwork.self) {
            NativeArtworkDetailView(artwork: $0)
        }
        .background(EastwoodBackground())
        .eastwoodEnterMotion(id: "section-\(kind.rawValue)")
    }

    private var controls: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        return VStack(spacing: 10) {
            HStack {
                TextField("Search in \(kind.title)", text: $query)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled(true)
                    .eastwoodInput()

                Picker("Sort", selection: $sort) {
                    ForEach(SectionSort.allCases) { item in
                        Text(item.rawValue).tag(item)
                    }
                }
                .pickerStyle(.menu)
                .tint(.white)
            }

            if kind == .shop {
                HStack(spacing: 10) {
                    Toggle("For Sale", isOn: $onlyForSale)
                        .toggleStyle(.switch)
                        .font(.footnote)

                    Spacer(minLength: 0)

                    Picker("Price", selection: $priceRange) {
                        ForEach(ShopPriceRange.allCases) { range in
                            Text(range.rawValue).tag(range)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(.white)
                }
            }

            HStack(spacing: 10) {
                Picker("Category", selection: $selectedCategory) {
                    ForEach(categories, id: \.self) { item in
                        Text(item).tag(item)
                    }
                }
                .pickerStyle(.menu)
                .tint(.white)

                Picker("Period", selection: $selectedPeriod) {
                    ForEach(periods, id: \.self) { item in
                        Text(item).tag(item)
                    }
                }
                .pickerStyle(.menu)
                .tint(.white)
            }
        }
        .padding(.horizontal, pagePad)
        .padding(.top, 10)
        .padding(.bottom, 10)
        .eastwoodPanel()
        .padding(.horizontal, pagePad)
    }

    private var sectionHero: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        return VStack(alignment: .leading, spacing: 6) {
            Text(kind.title)
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(EastwoodTheme.goldSoft)
            Text("Discover carefully selected pieces with native filtering and smooth browsing.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .eastwoodPanel()
        .padding(.horizontal, pagePad)
    }
}
