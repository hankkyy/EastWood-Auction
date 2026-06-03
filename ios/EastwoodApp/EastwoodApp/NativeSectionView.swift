import SwiftUI
import UIKit

enum NativeSectionKind: String, CaseIterable, Identifiable {
    case collections
    case shop
    case cases

    var id: String { rawValue }

    var title: String {
        switch self {
        case .collections: return "section.collections"
        case .shop: return "section.shop"
        case .cases: return "section.cases"
        }
    }
}

private enum SectionSort: String, CaseIterable, Identifiable {
    case newest
    case titleAZ

    var id: String { rawValue }
}

private enum ShopPriceRange: String, CaseIterable, Identifiable {
    case all = "section.all"
    case under1k = "< 1,000"
    case from1kTo5k = "1,000 - 5,000"
    case above5k = "> 5,000"

    var id: String { rawValue }
}

struct NativeSectionView: View {
    @EnvironmentObject private var language: LanguageManager
    let kind: NativeSectionKind
    let artworks: [NativeArtwork]

    @State private var sort: SectionSort = .newest
    @State private var query = ""
    @State private var onlyForSale = true
    @State private var priceRange: ShopPriceRange = .all
    @State private var selectedCategory = "section.all"
    @State private var selectedPeriod = "section.all"

    private var categories: [String] {
        let set = Set(baseItems.map(\.category).filter { !$0.isEmpty })
        return ["section.all"] + set.sorted()
    }

    private var periods: [String] {
        let set = Set(baseItems.map(\.period).filter { !$0.isEmpty })
        return ["section.all"] + set.sorted()
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
        if selectedCategory != "section.all" {
            searched = searched.filter { $0.category == selectedCategory }
        }
        if selectedPeriod != "section.all" {
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
            VStack(spacing: 14) {
                sectionHero
                controls

                HStack {
                    Text(kind == .shop ? language.text("section.activeListings") : language.text("section.curatedList"))
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                    Spacer()
                    Text("\(filtered.count)")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(EastwoodTheme.goldSoft)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.92), in: Capsule())
                        .overlay(Capsule().stroke(EastwoodTheme.hairline, lineWidth: 1))
                }
                .padding(.horizontal, pagePad)

                LazyVStack(spacing: 12) {
                    ForEach(filtered) { artwork in
                        NavigationLink(value: artwork) {
                            NativeArtworkListRow(artwork: artwork)
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
        .navigationTitle(language.text(kind.title))
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .navigationDestination(for: NativeArtwork.self) {
            NativeArtworkDetailView(artwork: $0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .eastwoodScreen()
        .eastwoodEnterMotion(id: "section-\(kind.rawValue)")
    }

    private var controls: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        return VStack(spacing: 12) {
            HStack {
                Label {
                    TextField(language.format("section.searchIn", language.text(kind.title)), text: $query)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                } icon: {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(EastwoodTheme.mutedText)
                }
                .eastwoodInput()

                Menu {
                    Picker(language.text("section.sort"), selection: $sort) {
                        ForEach(SectionSort.allCases) { item in
                            Text(sortLabel(item)).tag(item)
                        }
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.up.arrow.down")
                        Text(sortLabel(sort))
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.gold)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(EastwoodTheme.hairline, lineWidth: 1)
                    )
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    filterChip(title: selectedCategory, systemImage: "line.3.horizontal.decrease.circle")
                    filterChip(title: selectedPeriod, systemImage: "calendar")
                    if kind == .shop {
                        filterChip(title: priceRange == .all ? language.text("section.all") : priceRange.rawValue, systemImage: "tag")
                    }
                }
            }

            HStack(spacing: 10) {
                Menu {
                    Picker(language.text("section.category"), selection: $selectedCategory) {
                        ForEach(categories, id: \.self) { item in
                            Text(displayFilterValue(item)).tag(item)
                        }
                    }
                } label: {
                    quickFilterButton(title: language.text("section.category"))
                }

                Menu {
                    Picker(language.text("section.period"), selection: $selectedPeriod) {
                        ForEach(periods, id: \.self) { item in
                            Text(displayFilterValue(item)).tag(item)
                        }
                    }
                } label: {
                    quickFilterButton(title: language.text("section.period"))
                }

                if kind == .shop {
                    Toggle(isOn: $onlyForSale) {
                        Text(language.text("section.forSale"))
                            .font(.footnote.weight(.semibold))
                    }
                    .toggleStyle(.switch)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(EastwoodTheme.hairline, lineWidth: 1)
                    )
                }
            }
        }
        .padding(.horizontal, pagePad)
        .padding(.top, 2)
        .padding(.bottom, 2)
    }

    private func quickFilterButton(title: String) -> some View {
        HStack(spacing: 6) {
            Text(title)
            Image(systemName: "chevron.down")
                .font(.caption.weight(.semibold))
        }
        .font(.footnote.weight(.semibold))
        .foregroundStyle(EastwoodTheme.gold)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 1)
        )
    }

    private func filterChip(title: String, systemImage: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: systemImage)
                .font(.caption)
            Text(title)
                .lineLimit(1)
        }
        .font(.footnote.weight(.semibold))
        .foregroundStyle(title == "section.all" ? .secondary : EastwoodTheme.goldSoft)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.88), in: Capsule())
        .overlay(Capsule().stroke(EastwoodTheme.hairline, lineWidth: 1))
    }

    private var sectionHero: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        return VStack(alignment: .leading, spacing: 8) {
            Text(language.text(kind.title))
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(EastwoodTheme.ink)
            Text(kind == .shop ? language.text("section.hero.shop") : language.text("section.hero.default"))
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 4)
        .padding(.horizontal, pagePad)
    }

    private func displayFilterValue(_ value: String) -> String {
        if value == "section.all" {
            return language.text("section.all")
        }
        return value
    }

    private func sortLabel(_ sort: SectionSort) -> String {
        switch sort {
        case .newest:
            return language.text("section.sort.newest")
        case .titleAZ:
            return language.text("section.sort.titleAZ")
        }
    }
}
