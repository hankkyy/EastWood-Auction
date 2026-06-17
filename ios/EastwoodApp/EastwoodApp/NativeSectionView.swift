import SwiftUI
import UIKit
import PhotosUI

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

private enum SectionDisplayMode: String, CaseIterable, Identifiable {
    case list
    case cards

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
    @EnvironmentObject private var auth: AuthManager
    let kind: NativeSectionKind
    let artworks: [NativeArtwork]
    var onCatalogChanged: (() -> Void)? = nil

    @State private var sort: SectionSort = .newest
    @State private var query = ""
    @State private var onlyForSale = true
    @State private var priceRange: ShopPriceRange = .all
    @State private var selectedCategory = "section.all"
    @State private var selectedPeriod = "section.all"
    @State private var showingUpload = false
    @State private var showingManage = false
    @State private var displayMode: SectionDisplayMode
    @State private var categoryTab: String = "all"  // category tab bar

    init(kind: NativeSectionKind, artworks: [NativeArtwork], onCatalogChanged: (() -> Void)? = nil) {
        self.kind = kind
        self.artworks = artworks
        self.onCatalogChanged = onCatalogChanged
        let saved = UserDefaults.standard.string(forKey: "eastwood.section.display.\(kind.rawValue)")
        _displayMode = State(initialValue: SectionDisplayMode(rawValue: saved ?? "") ?? .list)
    }

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
        var result = baseItems

        // Category tab filter (collections only)
        if kind == .collections && categoryTab != "all" {
            result = result.filter {
                let key = "\($0.categoryZh ?? "") \($0.category)".lowercased()
                switch categoryTab {
                case "calligraphy": return key.contains("字画") || key.contains("书画") || key.contains("painting") || key.contains("calligraphy")
                case "porcelain": return key.contains("瓷") || key.contains("porcelain")
                case "jade": return key.contains("玉") || key.contains("jade")
                case "bronze": return key.contains("铜") || key.contains("bronze")
                case "misc": return true  // "misc" tab shows all remaining
                default: return true
                }
            }
        }

        // Existing keyword filter
        let keyword = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !keyword.isEmpty {
            result = result.filter {
                $0.title.lowercased().contains(keyword)
                || ($0.titleZh ?? "").lowercased().contains(keyword)
                || $0.category.lowercased().contains(keyword)
                || $0.period.lowercased().contains(keyword)
            }
        }
        if selectedCategory != "section.all" {
            result = result.filter { $0.category == selectedCategory }
        }
        if selectedPeriod != "section.all" {
            result = result.filter { $0.period == selectedPeriod }
        }

        if kind == .shop {
            if onlyForSale {
                result = result.filter { $0.isForSale == true }
            }

            switch priceRange {
            case .all: break
            case .under1k:
                result = result.filter { ($0.price ?? .infinity) < 1000 }
            case .from1kTo5k:
                result = result.filter { value in
                    let p = value.price ?? -1
                    return p >= 1000 && p <= 5000
                }
            case .above5k:
                result = result.filter { ($0.price ?? -1) > 5000 }
            }
        }

        switch sort {
        case .newest: return result
        case .titleAZ:
            return result.sorted {
                $0.displayTitle(in: language.language).localizedCaseInsensitiveCompare($1.displayTitle(in: language.language)) == .orderedAscending
            }
        }
    }

    private var ownItems: [NativeArtwork] {
        guard !auth.currentUserId.isEmpty else { return [] }
        return baseItems.filter { $0.uploadedBy == auth.currentUserId }
    }

    private var canUpload: Bool {
        switch kind {
        case .cases:
            return auth.isAuthenticated
        case .collections, .shop:
            return auth.isAdmin
        }
    }

    private var canManage: Bool {
        auth.isAdmin || !ownItems.isEmpty || (kind == .cases && auth.isAuthenticated)
    }

    private var sectionAccent: Color {
        switch kind {
        case .collections:
            return EastwoodTheme.collectionsAccent
        case .shop:
            return EastwoodTheme.shopAccent
        case .cases:
            return EastwoodTheme.casesAccent
        }
    }

    private var sectionTint: Color {
        switch kind {
        case .collections:
            return EastwoodTheme.collectionsAccent.opacity(0.45)
        case .shop:
            return EastwoodTheme.shopAccent.opacity(0.45)
        case .cases:
            return EastwoodTheme.casesAccent.opacity(0.45)
        }
    }

    private var sectionPanelGradient: LinearGradient {
        LinearGradient(
            colors: [
                EastwoodTheme.panel,
                sectionTint.opacity(0.42),
                EastwoodTheme.ivory,
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    var body: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 12) {
                sectionHero
                managementPanel
                controls

                // Category tabs (matching web's tab bar)
                if kind == .collections {
                    categoryTabBar
                        .padding(.horizontal, pagePad)
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(kind == .shop ? language.text("section.activeListings") : language.text("section.curatedList"))
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                        Spacer()
                        Text("\(filtered.count)")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(sectionAccent, in: Capsule())
                    }

                    Text(resultsSummary)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, pagePad)

                if filtered.isEmpty {
                    sectionEmptyView
                        .padding(.horizontal, pagePad)
                        .padding(.top, 8)
                } else {
                    contentGrid
                    .padding(pagePad)
                }
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
        .onChange(of: displayMode) { newValue in
            UserDefaults.standard.set(newValue.rawValue, forKey: "eastwood.section.display.\(kind.rawValue)")
        }
        .sheet(isPresented: $showingUpload) {
            NavigationStack {
                NativeArtworkManagementView(kind: kind, mode: .upload) {
                    showingUpload = false
                    onCatalogChanged?()
                }
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showingManage) {
            NavigationStack {
                NativeArtworkManagementView(kind: kind, mode: .manage) {
                    onCatalogChanged?()
                }
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Category Tab Bar (matching web's collections tabs)

    private let categoryTabs: [(String, String, String)] = [
        ("all", "section.all", "square.grid.2x2"),
        ("calligraphy", "category.calligraphy", "paintbrush"),
        ("porcelain", "category.porcelain", "cup.and.saucer"),
        ("jade", "category.jade", "sparkles"),
        ("bronze", "category.bronze", "shield"),
        ("misc", "category.misc", "square.grid.2x2"),
    ]

    private var categoryTabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(categoryTabs, id: \.0) { tab in
                    Button {
                        withAnimation(EastwoodMotion.listUpdate) { categoryTab = tab.0 }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: tab.2).font(.caption)
                            Text(tab.0 == "all" ? language.text("section.all") : language.text(tab.1))
                                .font(.caption.weight(.semibold))
                        }
                        .padding(.horizontal, 14).padding(.vertical, 9)
                        .foregroundStyle(categoryTab == tab.0 ? .white : EastwoodTheme.mutedText)
                        .background(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(categoryTab == tab.0 ? sectionAccent : sectionAccent.opacity(0.08))
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private var controls: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        return VStack(spacing: 10) {
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
                    .padding(.horizontal, 12)
                    .padding(.vertical, 11)
                    .background(EastwoodTheme.ivory.opacity(0.95), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(sectionAccent.opacity(0.12), lineWidth: 1)
                    )
                }
            }

            HStack(spacing: 8) {
                displayModePicker
                Spacer(minLength: 0)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    filterChip(title: selectedCategory, systemImage: "line.3.horizontal.decrease.circle")
                    filterChip(title: selectedPeriod, systemImage: "calendar")
                    if kind == .shop {
                        filterChip(title: priceRange == .all ? language.text("section.all") : priceRange.rawValue, systemImage: "tag")
                    }
                }
            }

            HStack(spacing: 8) {
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
                    .background(EastwoodTheme.ivory.opacity(0.94), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(sectionAccent.opacity(0.12), lineWidth: 1)
                    )
                }
            }
        }
        .padding(.horizontal, pagePad)
        .padding(.top, 1)
        .padding(.bottom, 1)
    }

    // MARK: - Empty State

    private var sectionEmptyView: some View {
        let (icon, title, msg): (String, String, String) = {
            switch kind {
            case .collections:
                return ("square.grid.2x2", lang("暂无藏品展示","No Collections Yet"), lang("管理员上传藏品后将在这里展示","Collections will appear here once uploaded by an admin"))
            case .shop:
                return ("bag", lang("暂无在售商品","No Products Yet"), lang("管理员发布商品后将在这里展示","Products will appear here once published by an admin"))
            case .cases:
                return ("arrow.triangle.2.circlepath", lang("暂无回流案例","No Return Cases"), lang("登录后即可上传回流案例","Sign in to upload return cases"))
            }
        }()
        return EastwoodStateView(systemImage: icon, title: title, message: msg,
            buttonTitle: (kind == .cases && !auth.isAdmin) ? lang("去登录上传","Sign in to Upload") : nil,
            onTap: (kind == .cases && !auth.isAdmin) ? { /* trigger sign in */ } : nil)
    }

    private func lang(_ zh: String, _ en: String) -> String { language.language == .chinese ? zh : en }

    // MARK: - Content Grid

    @ViewBuilder
    private var contentGrid: some View {
        switch displayMode {
        case .list:
            LazyVStack(spacing: 12) {
                ForEach(filtered) { artwork in
                    artworkNavigation(for: artwork) {
                        NativeArtworkListRow(artwork: artwork)
                    }
                }
            }
        case .cards:
            let columns = [
                GridItem(.flexible(), spacing: 10),
                GridItem(.flexible(), spacing: 10),
            ]
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(filtered) { artwork in
                    artworkNavigation(for: artwork) {
                        NativeArtworkCompactCard(artwork: artwork)
                    }
                }
            }
        }
    }

    private func artworkNavigation<Content: View>(for artwork: NativeArtwork, @ViewBuilder content: () -> Content) -> some View {
        NavigationLink(value: artwork) {
            content()
        }
        .buttonStyle(.plain)
        .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
    }

    private var displayModePicker: some View {
        HStack(spacing: 4) {
            modeButton(mode: .list, title: language.text("section.display.list"), systemImage: "list.bullet")
            modeButton(mode: .cards, title: language.text("section.display.cards"), systemImage: "square.grid.2x2")
        }
        .padding(4)
        .background(sectionTint.opacity(0.34), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(sectionAccent.opacity(0.12), lineWidth: 1)
        )
    }

    private func modeButton(mode: SectionDisplayMode, title: String, systemImage: String) -> some View {
        Button {
            displayMode = mode
        } label: {
            HStack(spacing: 6) {
                Image(systemName: systemImage)
                    .font(.caption.weight(.semibold))
                Text(title)
                    .lineLimit(1)
            }
            .font(.footnote.weight(.semibold))
            .foregroundStyle(displayMode == mode ? sectionAccent : EastwoodTheme.mutedText)
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(displayMode == mode ? EastwoodTheme.ivory : Color.clear)
            )
        }
        .buttonStyle(.plain)
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
        .foregroundStyle(title == "section.all" ? .secondary : sectionAccent.opacity(0.92))
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(sectionTint.opacity(title == "section.all" ? 0.18 : 0.38), in: Capsule())
        .overlay(Capsule().stroke(sectionAccent.opacity(0.10), lineWidth: 1))
    }

    private var sectionHero: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(kind == .cases ? "ARCHIVE" : (kind == .shop ? "SALON" : "CURATION"))
                        .font(.caption.weight(.semibold))
                        .tracking(1.2)
                        .foregroundStyle(sectionAccent)
                    Text(language.text(kind.title))
                        .font(.system(size: 28, weight: .bold, design: .serif))
                        .foregroundStyle(EastwoodTheme.ink)
                }
                Spacer()
                Circle()
                    .fill(sectionAccent.opacity(0.12))
                    .frame(width: 36, height: 36)
                    .overlay(
                        Image(systemName: kind == .shop ? "bag" : (kind == .cases ? "arrow.2.circlepath" : "square.grid.2x2"))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(sectionAccent)
                    )
            }
            Text(kind == .shop ? language.text("section.hero.shop") : language.text("section.hero.default"))
                .font(.subheadline)
                .foregroundStyle(.secondary)

            LazyVGrid(columns: overviewColumns, spacing: 8) {
                statPill(
                    title: language.language == .chinese ? "总数" : "Total",
                    value: "\(baseItems.count)"
                )
                statPill(
                    title: language.language == .chinese ? "筛选后" : "Filtered",
                    value: "\(filtered.count)"
                )
                statPill(
                    title: language.language == .chinese ? "我的内容" : "Mine",
                    value: auth.isAuthenticated ? "\(ownItems.count)" : "--"
                )
            }
        }
        .padding(12)
        .background(sectionPanelGradient, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(sectionAccent.opacity(0.14), lineWidth: 1)
        )
        .shadow(color: sectionAccent.opacity(0.10), radius: 16, y: 8)
        .padding(.horizontal, pagePad)
    }

    @ViewBuilder
    private var managementPanel: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        VStack(alignment: .leading, spacing: 12) {
            Text(managementTitle)
                .font(.headline.weight(.semibold))
                .foregroundStyle(EastwoodTheme.ink)

            Text(managementDescription)
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack(spacing: 10) {
                statPill(
                    title: language.language == .chinese ? "总数" : "Total",
                    value: "\(baseItems.count)"
                )
                if auth.isAuthenticated {
                    statPill(
                        title: language.language == .chinese ? "我的内容" : "Mine",
                        value: "\(ownItems.count)"
                    )
                }
                statPill(
                    title: language.language == .chinese ? "权限" : "Access",
                    value: auth.isAdmin
                        ? (language.language == .chinese ? "管理员" : "Admin")
                        : (auth.isAuthenticated
                            ? (language.language == .chinese ? "个人用户" : "User")
                            : (language.language == .chinese ? "访客" : "Guest"))
                )
            }

            HStack(spacing: 10) {
                if canUpload {
                    Button(uploadButtonTitle) {
                        showingUpload = true
                    }
                    .buttonStyle(EastwoodPrimaryButtonStyle())
                }

                if canManage {
                    Button(manageButtonTitle) {
                        showingManage = true
                    }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                }
            }

            if !auth.isAuthenticated && kind == .cases {
                Text(language.language == .chinese ? "登录后即可上传并管理您自己的回流案例。" : "Sign in to upload and manage your own return cases.")
                    .font(.caption)
                    .foregroundStyle(EastwoodTheme.mutedText)
            }
        }
        .padding(14)
        .padding(.horizontal, pagePad)
        .eastwoodPanel()
        .padding(.horizontal, pagePad)
    }

    private var managementTitle: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "回流案例上传与管理" : "Return Case Upload & Management"
        case .collections:
            return language.language == .chinese ? "藏品展示管理" : "Collection Display Management"
        case .shop:
            return language.language == .chinese ? "古董商店管理" : "Antique Shop Management"
        }
    }

    private var managementDescription: String {
        switch kind {
        case .cases:
            if auth.isAdmin {
                return language.language == .chinese ? "管理员可管理全部案例；登录用户也可以上传并管理自己提交的回流案例。" : "Admins can manage all cases; signed-in users can also upload and manage their own return cases."
            }
            return language.language == .chinese ? "登录后可上传回流案例，并在管理页查看、编辑或删除自己提交的内容。" : "Sign in to upload return cases and manage the items you submitted."
        case .collections:
            if auth.isAdmin {
                return language.language == .chinese ? "管理员可上传、编辑和下架全部藏品展示内容；普通用户仅可管理自己历史上传的内容。" : "Admins can upload, edit, and manage all display collection items; regular users can manage their previously uploaded items."
            }
            return language.language == .chinese ? "网页版仅允许管理员新建藏品展示。若您有历史上传内容，仍可在这里继续管理。" : "Web parity: only admins can create new collection display items. If you already uploaded items before, you can still manage them here."
        case .shop:
            if auth.isAdmin {
                return language.language == .chinese ? "管理员可上传、编辑和管理在售商品；普通用户仅可管理自己历史上传的商品。" : "Admins can upload, edit, and manage active shop items; regular users can manage their previously uploaded products."
            }
            return language.language == .chinese ? "网页版仅允许管理员新建古董商店商品。若您有历史上传商品，仍可在这里继续管理。" : "Web parity: only admins can create new shop products. If you already uploaded products before, you can still manage them here."
        }
    }

    private var uploadButtonTitle: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "上传案例" : "Upload Case"
        case .collections:
            return language.language == .chinese ? "上传藏品" : "Upload Collection"
        case .shop:
            return language.language == .chinese ? "上传商品" : "Upload Product"
        }
    }

    private var manageButtonTitle: String {
        if auth.isAdmin {
            return language.language == .chinese ? "管理全部" : "Manage All"
        }
        return language.language == .chinese ? "管理我的内容" : "Manage Mine"
    }

    private func displayFilterValue(_ value: String) -> String {
        if value == "section.all" {
            return language.text("section.all")
        }
        if let artwork = baseItems.first(where: { $0.category == value }) {
            return artwork.displayCategory(in: language.language)
        }
        if let artwork = baseItems.first(where: { $0.period == value }) {
            return artwork.displayPeriod(in: language.language)
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

    private var overviewColumns: [GridItem] {
        [GridItem(.adaptive(minimum: 110), spacing: 8)]
    }

    private func statPill(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(EastwoodTheme.ink)
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(sectionTint.opacity(0.42), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(sectionAccent.opacity(0.10), lineWidth: 1)
        )
    }

    private var resultsSummary: String {
        if filtered.isEmpty {
            return language.language == .chinese ? "当前筛选条件下没有结果，可以调整分类、时期或关键词。" : "No items match the current filters yet. Try adjusting the category, period, or search keywords."
        }
        if filtered.count == baseItems.count {
            return language.language == .chinese ? "当前展示全部内容，可以继续筛选、上传或进入管理页。" : "You are viewing the full catalog for this section. Keep browsing, refine filters, or jump into management."
        }
        return language.language == .chinese ? "已根据当前筛选条件收窄结果，点进详情后也可以直接继续咨询或管理。" : "Results are narrowed by the current filters. Open any item to continue with inquiry or jump into management."
    }
}

enum NativeArtworkManagementMode {
    case upload
    case manage
}

private struct NativeArtworkDraft {
    var title = ""
    var description = ""
    var category = "misc"
    var period = ""
    var images: [UIImage] = []
    var coverIndex = 0
    var collectionId = ""
    var isForSale = false
    var price = ""
    var currency = "CNY"
    var caseId = ""
    var salePrice = ""
    var saleTime = ""
    var salePlatform = ""
    var clientRegion = ""
    var logisticsCost = ""
    var purchaseChannel = ""
    var purchaseCost = ""
    var riskAdvice = ""

    init() {}

    init(artwork: NativeArtwork) {
        title = artwork.title
        description = artwork.description
        category = artwork.category
        period = artwork.period
        collectionId = artwork.collectionId ?? ""
        isForSale = artwork.isForSale ?? false
        if let priceValue = artwork.price {
            price = String(format: "%.0f", priceValue)
        }
        currency = artwork.currency ?? "CNY"
        if let caseRecord = artwork.caseRecord {
            caseId = caseRecord.caseId
            salePrice = caseRecord.salePrice
            saleTime = caseRecord.saleTime
            salePlatform = caseRecord.salePlatform
            clientRegion = caseRecord.clientRegion
            logisticsCost = caseRecord.logisticsCost
            purchaseChannel = caseRecord.purchaseChannel
            purchaseCost = caseRecord.purchaseCost
            riskAdvice = caseRecord.riskAdvice
        }
    }

    var hasImages: Bool { !images.isEmpty }
}

@MainActor
private final class NativeArtworkManagementStore: ObservableObject {
    @Published var artworks: [NativeArtwork] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        guard let api = NativeAPIClient() else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let data = try await api.requestJSON(path: "api/artworks", retries: 1)
            let decoded = try JSONDecoder().decode(NativeArtworkResponse.self, from: data)
            artworks = decoded.artworks
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func create(artwork: [String: Any], token: String) async throws {
        guard let api = NativeAPIClient() else { return }
        _ = try await api.requestJSON(path: "api/artworks", method: "POST", token: token, body: ["artwork": artwork], retries: 0)
        await load()
    }

    func update(artworkId: String, artwork: [String: Any], token: String) async throws {
        guard let api = NativeAPIClient() else { return }
        _ = try await api.requestJSON(path: "api/artworks/\(artworkId)", method: "PATCH", token: token, body: ["artwork": artwork], retries: 0)
        await load()
    }

    func delete(artworkId: String, token: String) async throws {
        guard let api = NativeAPIClient() else { return }
        _ = try await api.requestJSON(path: "api/artworks/\(artworkId)", method: "DELETE", token: token, retries: 0)
        artworks.removeAll { $0.id == artworkId }
    }
}

struct NativeArtworkManagementView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @Environment(\.dismiss) private var dismiss

    let kind: NativeSectionKind
    let mode: NativeArtworkManagementMode
    var initialEditingArtwork: NativeArtwork? = nil
    var onChanged: (() -> Void)? = nil

    @StateObject private var store = NativeArtworkManagementStore()
    @State private var draft = NativeArtworkDraft()
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var editingArtwork: NativeArtwork?
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingUploadFlow = false
    @State private var deleteCandidate: NativeArtwork?
    @State private var showingDeleteConfirmation = false

    private var visibleItems: [NativeArtwork] {
        let base = store.artworks.filter {
            switch kind {
            case .cases:
                return $0.caseRecord != nil
            case .collections:
                return $0.listingType == "collection"
            case .shop:
                return $0.listingType == "product" || $0.isForSale == true
            }
        }

        if auth.isAdmin {
            return sortedItems(base)
        }
        return sortedItems(base.filter { $0.uploadedBy == auth.currentUserId })
    }

    private var canCreate: Bool {
        switch kind {
        case .cases:
            return auth.isAuthenticated
        case .collections, .shop:
            return auth.isAdmin
        }
    }

    var body: some View {
        screenContent
        .navigationTitle(sheetTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(content: toolbarContent)
        .task { await store.load() }
        .onAppear {
            if mode == .manage, let initialEditingArtwork {
                editingArtwork = initialEditingArtwork
            }
        }
        .refreshable { await store.load() }
        .onChange(of: selectedItems) { newItems in
            Task { await loadPickerItems(newItems) }
        }
        .sheet(item: $editingArtwork) { artwork in
            NavigationStack {
                NativeArtworkEditorForm(
                    kind: kind,
                    title: editorTitle(for: artwork),
                    seed: artwork,
                    visibleArtworks: visibleItems,
                    onSaved: { payload in
                        try await store.update(artworkId: artwork.id, artwork: payload, token: auth.accessToken)
                        onChanged?()
                    },
                    onDeleted: {
                        try await store.delete(artworkId: artwork.id, token: auth.accessToken)
                        onChanged?()
                    }
                )
            }
        }
        .sheet(isPresented: $showingUploadFlow) {
            NavigationStack {
                NativeArtworkManagementView(kind: kind, mode: .upload) {
                    showingUploadFlow = false
                    onChanged?()
                }
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .confirmationDialog(
            language.language == .chinese ? "确认删除这条内容吗？" : "Delete this item?",
            isPresented: $showingDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button(language.text("common.delete"), role: .destructive) {
                if let artwork = deleteCandidate {
                    Task { await delete(artwork) }
                }
            }
        } message: {
            Text(deleteCandidate.map(deleteMessage(for:)) ?? "")
        }
    }

    @ViewBuilder
    private var screenContent: some View {
        switch mode {
        case .upload:
            uploadBody
        case .manage:
            manageBody
        }
    }

    @ToolbarContentBuilder
    private func toolbarContent() -> some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button(closeButtonTitle) {
                dismiss()
            }
        }
    }

    private var uploadBody: some View {
        ScrollView {
            VStack(spacing: 14) {
                introCard(text: uploadIntroText)

                if !canCreate {
                    EastwoodStateView(
                        systemImage: "lock.fill",
                        title: language.language == .chinese ? "当前账号不能新建" : "This account cannot create new items",
                        message: uploadBlockedMessage
                    )
                } else {
                    NativeArtworkEditorForm(
                        kind: kind,
                        title: uploadButtonTitle,
                        seed: nil,
                        visibleArtworks: visibleItems,
                        onSaved: { payload in
                            try await store.create(artwork: payload, token: auth.accessToken)
                            onChanged?()
                            dismiss()
                        }
                    )
                }
            }
            .padding(.vertical, 12)
        }
        .background(EastwoodBackground())
    }

    private var manageBody: some View {
        ScrollView {
            VStack(spacing: 14) {
                introCard(text: manageIntroText)
                manageOverviewCard

                if store.isLoading && visibleItems.isEmpty {
                    EastwoodSkeletonList(count: 3)
                        .padding(.horizontal, EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width))
                } else if visibleItems.isEmpty {
                    EastwoodStateView(
                        systemImage: "shippingbox",
                        title: language.language == .chinese ? "还没有可管理的内容" : "Nothing to manage yet",
                        message: emptyManageText,
                        buttonTitle: canCreate ? uploadButtonTitle : nil,
                        onTap: canCreate ? { showingUploadFlow = true } : nil
                    )
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(visibleItems) { artwork in
                            manageRow(artwork)
                        }
                    }
                    .padding(.horizontal, EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width))
                }
            }
            .padding(.vertical, 12)
        }
        .background(EastwoodBackground())
    }

    private var manageOverviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(language.language == .chinese ? "管理概览" : "Management Overview")
                .font(.headline)

            LazyVGrid(columns: overviewColumns, spacing: 8) {
                statPill(title: language.language == .chinese ? "可管理" : "Visible", value: "\(visibleItems.count)")
                statPill(title: language.language == .chinese ? "管理员上传" : "Official", value: "\(visibleItems.filter { $0.isOfficial == true }.count)")
                statPill(title: language.language == .chinese ? "用户上传" : "User", value: "\(visibleItems.filter { $0.isOfficial != true }.count)")
            }

            Text(manageOverviewText)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .eastwoodPanel()
        .padding(.horizontal, EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width))
    }

    private func introCard(text: String) -> some View {
        Text(text)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .eastwoodPanel()
            .padding(.horizontal, EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width))
    }

    private func manageRow(_ artwork: NativeArtwork) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            NavigationLink {
                NativeArtworkDetailView(artwork: artwork)
            } label: {
                NativeArtworkListRow(artwork: artwork, embedded: true)
            }
            .buttonStyle(.plain)

            Divider()

            VStack(alignment: .leading, spacing: 6) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        manageBadge(
                            (artwork.isOfficial ?? false)
                                ? (language.language == .chinese ? "平台上传" : "Platform Upload")
                                : (language.language == .chinese ? "用户上传" : "User Upload"),
                            color: (artwork.isOfficial ?? false) ? EastwoodTheme.goldSoft : Color.orange
                        )
                        manageBadge(
                            artwork.caseRecord != nil
                                ? (language.language == .chinese ? "回流案例" : "Return Case")
                                : (kind == .shop
                                    ? (language.language == .chinese ? "古董商品" : "Shop Product")
                                    : (language.language == .chinese ? "藏品展示" : "Collection Display")),
                            color: artwork.caseRecord != nil ? Color.green : EastwoodTheme.gold
                        )
                        manageBadge(
                            artwork.isForSale == true
                                ? (language.language == .chinese ? "可出售" : "For Sale")
                                : (language.language == .chinese ? "仅展示" : "Display Only"),
                            color: artwork.isForSale == true ? Color.teal : .secondary
                        )
                        if auth.isAdmin, artwork.uploadedBy == auth.currentUserId, !auth.currentUserId.isEmpty {
                            manageBadge(language.language == .chinese ? "我的上传" : "My Upload", color: Color.blue)
                        }
                    }
                }

                LazyVGrid(columns: manageMetaColumns, alignment: .leading, spacing: 8) {
                    if let code = artwork.collectionId ?? artwork.caseRecord?.caseId, !code.isEmpty {
                        manageMetaCard(
                            label: language.language == .chinese ? "编号" : "Code",
                            value: code
                        )
                    }
                    manageMetaCard(
                        label: language.language == .chinese ? "来源" : "Source",
                        value: (artwork.isOfficial ?? false)
                            ? (language.language == .chinese ? "平台上传" : "Platform Upload")
                            : (language.language == .chinese ? "用户上传" : "User Upload")
                    )
                    if artwork.isForSale == true, let price = artwork.price {
                        manageMetaCard(
                            label: language.language == .chinese ? "价格" : "Price",
                            value: "\(artwork.currency ?? "CNY") \(String(format: "%.0f", price))"
                        )
                    }
                }

                ForEach(manageSummaryRows(for: artwork), id: \.label) { row in
                    smallMetaRow(label: row.label, value: row.value)
                }
                Text(manageRecordHint(for: artwork))
                    .font(.caption)
                    .foregroundStyle(EastwoodTheme.mutedText)
            }

            actionSection(for: artwork)
        }
        .padding(12)
        .eastwoodPanel()
    }

    @ViewBuilder
    private func actionSection(for artwork: NativeArtwork) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 10) {
                if let code = artwork.collectionId ?? artwork.caseRecord?.caseId, !code.isEmpty {
                    inquiryButton(code: code)
                }

                editButton(for: artwork)
                deleteButton(for: artwork)
            }

            VStack(spacing: 8) {
                if let code = artwork.collectionId ?? artwork.caseRecord?.caseId, !code.isEmpty {
                    inquiryButton(code: code)
                }

                HStack(spacing: 8) {
                    editButton(for: artwork)
                    deleteButton(for: artwork)
                }
            }
        }
    }

    private func inquiryButton(code: String) -> some View {
        NavigationLink {
            NativeInquiryFormView(prefilledCode: code)
        } label: {
            Text(language.language == .chinese ? "发送咨询" : "Send Inquiry")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(EastwoodSecondaryButtonStyle())
    }

    private func editButton(for artwork: NativeArtwork) -> some View {
        Button(language.language == .chinese ? "编辑" : "Edit") {
            editingArtwork = artwork
        }
        .buttonStyle(EastwoodSecondaryButtonStyle())
        .frame(maxWidth: .infinity)
    }

    private func deleteButton(for artwork: NativeArtwork) -> some View {
        Button(language.language == .chinese ? "删除" : "Delete", role: .destructive) {
            deleteCandidate = artwork
            showingDeleteConfirmation = true
        }
        .buttonStyle(EastwoodSecondaryButtonStyle())
        .frame(maxWidth: .infinity)
    }

    private func manageBadge(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(color.opacity(0.12), in: Capsule())
    }

    private func manageMetaCard(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(EastwoodTheme.ink)
                .lineLimit(1)
                .truncationMode(.middle)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.82), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 1)
        )
    }

    private func smallMetaRow(label: String, value: String) -> some View {
        HStack(spacing: 6) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.medium))
                .foregroundStyle(EastwoodTheme.ink)
                .lineLimit(1)
                .truncationMode(.middle)
        }
    }

    private func manageSummaryRows(for artwork: NativeArtwork) -> [(label: String, value: String)] {
        if let caseRecord = artwork.caseRecord {
            var rows: [(String, String)] = []
            if !caseRecord.salePlatform.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                rows.append((
                    language.language == .chinese ? "成交平台" : "Sale Platform",
                    caseRecord.salePlatform
                ))
            }
            if !caseRecord.saleTime.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                rows.append((
                    language.language == .chinese ? "成交时间" : "Sale Time",
                    caseRecord.saleTime
                ))
            }
            if !caseRecord.clientRegion.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                rows.append((
                    language.language == .chinese ? "客户地区" : "Client Region",
                    caseRecord.clientRegion
                ))
            }
            if !caseRecord.salePrice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                rows.append((
                    language.language == .chinese ? "成交价格" : "Sale Price",
                    caseRecord.salePrice
                ))
            }
            return rows
        }

        var rows: [(String, String)] = []
        let category = artwork.displayCategory(in: language.language).trimmingCharacters(in: .whitespacesAndNewlines)
        if !category.isEmpty {
            rows.append((
                language.language == .chinese ? "分类" : "Category",
                category
            ))
        }
        let period = artwork.displayPeriod(in: language.language).trimmingCharacters(in: .whitespacesAndNewlines)
        if !period.isEmpty {
            rows.append((
                language.language == .chinese ? "时期" : "Period",
                period
            ))
        }
        return rows
    }

    private var manageOverviewText: String {
        switch kind {
        case .cases:
            return auth.isAdmin
                ? (language.language == .chinese ? "管理员可直接筛查官方案例与用户案例，删除后会同时影响 app 前台与网页后台。" : "Admins can review both official and user-submitted cases here; deleting a record removes it from both the app and web admin.")
                : (language.language == .chinese ? "这里只显示当前账号可继续维护的回流案例，方便快速编辑、删除或发起咨询。" : "Only the return cases this account can still maintain appear here, so you can quickly edit, delete, or send an inquiry.")
        case .collections:
            return auth.isAdmin
                ? (language.language == .chinese ? "这里集中查看藏品展示的官方内容与用户历史上传内容，便于统一维护编号、图集与展示文案。" : "Review official showcase entries and any historical user uploads in one place, making it easier to maintain IDs, galleries, and display copy.")
                : (language.language == .chinese ? "这里只显示当前账号名下可继续维护的藏品展示记录。" : "Only collection display records still linked to this account are shown here.")
        case .shop:
            return auth.isAdmin
                ? (language.language == .chinese ? "古董商店的编号、价格、封面图和上架状态都可以在这里统一维护，并会同步到网页商品详情。" : "Shop product IDs, prices, cover images, and sale status can all be maintained here and sync to the web product detail pages.")
                : (language.language == .chinese ? "这里只显示当前账号仍可维护的历史商品记录。" : "Only historical shop items this account can still maintain are shown here.")
        }
    }

    private var closeButtonTitle: String {
        language.text("common.close")
    }

    private var overviewColumns: [GridItem] {
        let width = UIScreen.main.bounds.width
        if width < 390 {
            return [GridItem(.flexible()), GridItem(.flexible())]
        }
        return [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]
    }

    private var manageMetaColumns: [GridItem] {
        let width = UIScreen.main.bounds.width
        if width < 390 {
            return [GridItem(.flexible())]
        }
        return [GridItem(.flexible()), GridItem(.flexible())]
    }

    private func manageRecordHint(for artwork: NativeArtwork) -> String {
        if artwork.caseRecord != nil {
            return language.language == .chinese
                ? "适合在这里快速核对成交平台、时间和地区，再决定是否进入详情或编辑。"
                : "Use this row to quickly verify the platform, timing, and region before opening details or editing."
        }

        if kind == .shop {
            return language.language == .chinese
                ? "这里会同步影响古董商店商品卡片、详情页和后台管理中的价格与图集显示。"
                : "Updates here affect the antique shop cards, detail pages, and admin pricing/gallery display."
        }

        return language.language == .chinese
            ? "这里会同步影响藏品展示列表、详情页和后台管理中的展示信息。"
            : "Updates here affect the collection display list, detail pages, and admin presentation copy."
    }

    private func sortedItems(_ items: [NativeArtwork]) -> [NativeArtwork] {
        items.sorted { lhs, rhs in
            let lhsOfficial = lhs.isOfficial == true
            let rhsOfficial = rhs.isOfficial == true
            if lhsOfficial != rhsOfficial {
                return lhsOfficial && !rhsOfficial
            }

            let lhsCode = (lhs.collectionId ?? lhs.caseRecord?.caseId ?? "").lowercased()
            let rhsCode = (rhs.collectionId ?? rhs.caseRecord?.caseId ?? "").lowercased()
            if lhsCode != rhsCode, !lhsCode.isEmpty, !rhsCode.isEmpty {
                return lhsCode < rhsCode
            }

            return lhs.displayTitle(in: language.language).localizedCaseInsensitiveCompare(rhs.displayTitle(in: language.language)) == .orderedAscending
        }
    }

    private func delete(_ artwork: NativeArtwork) async {
        do {
            try await store.delete(artworkId: artwork.id, token: auth.accessToken)
            onChanged?()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteMessage(for artwork: NativeArtwork) -> String {
        let name = artwork.displayTitle(in: language.language)
        if language.language == .chinese {
            return "删除后，\(name) 会从 app 和网页后台同时移除。"
        }
        return "\(name) will be removed from both the app and web admin."
    }

    private var sheetTitle: String {
        switch mode {
        case .upload:
            return uploadButtonTitle
        case .manage:
            return manageButtonTitle
        }
    }

    private var uploadButtonTitle: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "上传回流案例" : "Upload Return Case"
        case .collections:
            return language.language == .chinese ? "上传藏品展示" : "Upload Collection Display"
        case .shop:
            return language.language == .chinese ? "上传古董商品" : "Upload Shop Product"
        }
    }

    private var manageButtonTitle: String {
        auth.isAdmin
            ? (language.language == .chinese ? "管理全部内容" : "Manage All Items")
            : (language.language == .chinese ? "管理我的内容" : "Manage My Items")
    }

    private var uploadIntroText: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "与网页版一致：登录用户可以上传回流案例，多图展示，自动生成案例编号，并保存到 Supabase 云端。" : "Matches the web flow: signed-in users can upload return cases, attach multiple images, generate a case ID automatically, and save everything to Supabase."
        case .collections:
            return language.language == .chinese ? "与网页版一致：新建藏品展示默认由管理员完成；普通用户若有历史上传内容，仍可继续管理。" : "Matches the web flow: new collection display items are created by admins, while regular users can continue managing any previously uploaded items."
        case .shop:
            return language.language == .chinese ? "与网页版一致：古董商店商品由管理员发布，支持多图、售价和编号管理，并持久化到 Supabase。" : "Matches the web flow: shop products are published by admins, with multi-image, price, and collection ID management persisted to Supabase."
        }
    }

    private var manageIntroText: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "这里可以查看、编辑或删除您上传的案例；管理员可查看全部案例。" : "Review, edit, or delete your uploaded cases here; admins can review all cases."
        case .collections:
            return language.language == .chinese ? "这里可以管理藏品展示内容，并保持与网页端后台相同的数据源。" : "Manage collection display items here with the same cloud-backed source used by the web admin."
        case .shop:
            return language.language == .chinese ? "这里可以管理古董商店商品，并保持与网页端后台相同的数据源。" : "Manage shop products here with the same cloud-backed source used by the web admin."
        }
    }

    private func statPill(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(EastwoodTheme.ink)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.9), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 1)
        )
    }

    private var uploadBlockedMessage: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "请先登录后再上传回流案例。" : "Please sign in before uploading a return case."
        case .collections:
            return language.language == .chinese ? "网页版这部分仅管理员可新建藏品展示。" : "On the web, only admins can create new collection display items."
        case .shop:
            return language.language == .chinese ? "网页版这部分仅管理员可新建古董商店商品。" : "On the web, only admins can create new shop products."
        }
    }

    private var emptyManageText: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "您还没有上传任何回流案例。上传后可以在这里继续编辑、删除或发送咨询。" : "You haven't uploaded any return cases yet. After uploading, you can edit, delete, or send inquiries from here."
        case .collections:
            return language.language == .chinese ? "当前没有可管理的藏品展示内容。管理员可先新建内容，后续都能在这里集中维护。" : "There are no collection display items you can manage yet. Admins can create them first and maintain everything here afterward."
        case .shop:
            return language.language == .chinese ? "当前没有可管理的古董商店商品。管理员发布后，可在这里继续维护在售状态与商品资料。" : "There are no shop products you can manage yet. Once admins publish them, you can maintain listing status and product details here."
        }
    }

    private func editorTitle(for artwork: NativeArtwork) -> String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "编辑回流案例" : "Edit Return Case"
        case .collections:
            return language.language == .chinese ? "编辑藏品展示" : "Edit Collection Display"
        case .shop:
            return language.language == .chinese ? "编辑古董商品" : "Edit Shop Product"
        }
    }

    private func loadPickerItems(_ items: [PhotosPickerItem]) async {
        guard !items.isEmpty else { return }
        var images: [UIImage] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                images.append(image)
            }
        }
        draft.images.append(contentsOf: images)
        selectedItems = []
    }
}

private struct NativeArtworkEditorForm: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @Environment(\.dismiss) private var dismiss

    let kind: NativeSectionKind
    let title: String
    let seed: NativeArtwork?
    let visibleArtworks: [NativeArtwork]
    let onSaved: ([String: Any]) async throws -> Void
    var onDeleted: (() async throws -> Void)? = nil

    @State private var draft = NativeArtworkDraft()
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var existingRemoteImages: [String] = []
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingDeleteConfirm = false

    private enum PreviewAsset: Identifiable {
        case remote(String)
        case local(UIImage)

        var id: String {
            switch self {
            case .remote(let url):
                return "remote-\(url)"
            case .local(let image):
                return "local-\(ObjectIdentifier(image))"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                sectionCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(title)
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                        Text(formIntro)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                sectionCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(language.language == .chinese ? "同步与权限" : "Sync & Access")
                            .font(.headline)
                        Text(accessSummary)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        HStack(spacing: 8) {
                            formChip(language.language == .chinese ? "Supabase 云端" : "Supabase Cloud")
                            formChip(language.language == .chinese ? "网页后台同步" : "Web Admin Sync")
                            formChip(kind == .cases ? (language.language == .chinese ? "案例管理" : "Case Management") : (language.language == .chinese ? "目录管理" : "Catalog Management"))
                        }
                    }
                }

                if let errorMessage {
                    sectionCard {
                        Text(errorMessage)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(.red)
                    }
                }

                sectionCard {
                    VStack(alignment: .leading, spacing: 12) {
                        sectionHeading(
                            title: fieldLabelImages,
                            subtitle: imageHelperText
                        )

                        LazyVGrid(columns: imageOverviewColumns, spacing: 8) {
                            imageInfoPill(
                                title: language.language == .chinese ? "总图片" : "Total Images",
                                value: "\(imageCount)"
                            )
                            imageInfoPill(
                                title: language.language == .chinese ? "封面" : "Cover",
                                value: imageCount == 0
                                    ? "--"
                                    : "\(draft.coverIndex + 1)"
                            )
                            imageInfoPill(
                                title: language.language == .chinese ? "新上传" : "New Uploads",
                                value: "\(draft.images.count)"
                            )
                        }

                        PhotosPicker(selection: $pickerItems, maxSelectionCount: 8, matching: .images) {
                            Label(language.language == .chinese ? "选择图片" : "Choose Photos", systemImage: "photo.on.rectangle.angled")
                        }
                        .buttonStyle(EastwoodSecondaryButtonStyle())

                        if imageCount == 0 {
                            Text(language.language == .chinese ? "请至少添加一张图片。" : "Please add at least one image.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        } else {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 10) {
                                    ForEach(Array(previewAssets.enumerated()), id: \.offset) { index, asset in
                                        ZStack(alignment: .topTrailing) {
                                            previewTile(asset: asset, index: index)

                                            Button {
                                                removeImage(at: index)
                                            } label: {
                                                Image(systemName: "xmark.circle.fill")
                                                    .foregroundStyle(.white, .black.opacity(0.6))
                                            }
                                        }
                                    }
                                }
                            }
                            Text(language.language == .chinese ? "点按缩略图设置封面图；金色描边表示当前封面。" : "Tap a thumbnail to set the cover image. The gold outline marks the current cover.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                sectionCard {
                    VStack(alignment: .leading, spacing: 12) {
                        sectionHeading(
                            title: language.language == .chinese ? "基础信息" : "Basic Information",
                            subtitle: basicInfoHelper
                        )

                        labeledField(fieldLabelTitle, required: true, helper: titleHelperText) {
                            TextField(fieldLabelTitle, text: $draft.title)
                                .eastwoodInput()
                        }

                        labeledField(fieldLabelCategory, required: true, helper: categoryHelperText) {
                            Picker(fieldLabelCategory, selection: $draft.category) {
                                ForEach(categoryOptions, id: \.value) { option in
                                    Text(option.label).tag(option.value)
                                }
                            }
                            .pickerStyle(.menu)
                        }

                        labeledField(fieldLabelPeriod, helper: periodHelperText) {
                            TextField(fieldLabelPeriod, text: $draft.period)
                                .eastwoodInput()
                        }

                        labeledField(
                            kind == .shop
                                ? (language.language == .chinese ? "商品介绍" : "Product Description")
                                : (language.language == .chinese ? "详细说明" : "Description"),
                            helper: descriptionHelperText
                        ) {
                            TextEditor(text: $draft.description)
                                .frame(minHeight: 120)
                                .padding(10)
                                .background(EastwoodTheme.searchFill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                    }
                }

                if kind == .cases {
                    sectionCard {
                        VStack(alignment: .leading, spacing: 12) {
                            sectionHeading(
                                title: language.language == .chinese ? "回流信息" : "Return Case Details",
                                subtitle: language.language == .chinese ? "用于记录已成交案例的成交信息、客户地区和经验提示，和网页端回流管理保持同一套数据结构。" : "Capture sale facts, buyer region, and advisory notes for completed cases using the same structure as the web return-case manager."
                            )

                            lockedIdRow(fieldLabelCode, text: $draft.caseId, generator: generateCaseId, helper: caseIdHelperText)

                            labeledField(fieldLabelSalePrice, required: true, helper: salePriceHelperText) {
                                TextField(fieldLabelSalePrice, text: $draft.salePrice).eastwoodInput()
                            }
                            labeledField(fieldLabelSaleTime, required: true, helper: saleTimeHelperText) {
                                TextField(fieldLabelSaleTime, text: $draft.saleTime).eastwoodInput()
                            }
                            labeledField(fieldLabelSalePlatform, required: true, helper: salePlatformHelperText) {
                                TextField(fieldLabelSalePlatform, text: $draft.salePlatform).eastwoodInput()
                            }
                            labeledField(fieldLabelClientRegion, helper: clientRegionHelperText) {
                                TextField(fieldLabelClientRegion, text: $draft.clientRegion).eastwoodInput()
                            }
                            labeledField(optionalLabel(language.language == .chinese ? "物流成本" : "Logistics Cost"), helper: logisticsHelperText) {
                                TextField(optionalLabel(language.language == .chinese ? "物流成本" : "Logistics Cost"), text: $draft.logisticsCost).eastwoodInput()
                            }
                            labeledField(optionalLabel(language.language == .chinese ? "采购渠道" : "Purchase Channel"), helper: purchaseChannelHelperText) {
                                TextField(optionalLabel(language.language == .chinese ? "采购渠道" : "Purchase Channel"), text: $draft.purchaseChannel).eastwoodInput()
                            }
                            labeledField(optionalLabel(language.language == .chinese ? "采购成本" : "Purchase Cost"), helper: purchaseCostHelperText) {
                                TextField(optionalLabel(language.language == .chinese ? "采购成本" : "Purchase Cost"), text: $draft.purchaseCost).eastwoodInput()
                            }
                            labeledField(optionalLabel(language.language == .chinese ? "避坑建议" : "Risk Advice"), helper: riskAdviceHelperText) {
                                TextEditor(text: $draft.riskAdvice)
                                    .frame(minHeight: 90)
                                    .padding(10)
                                    .background(EastwoodTheme.searchFill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            }
                        }
                    }
                } else {
                    sectionCard {
                        VStack(alignment: .leading, spacing: 12) {
                            sectionHeading(
                                title: kind == .shop
                                    ? (language.language == .chinese ? "上架信息" : "Listing Details")
                                    : (language.language == .chinese ? "展示与销售设置" : "Display & Sales Settings"),
                                subtitle: kind == .shop
                                    ? (language.language == .chinese ? "古董商店商品默认视为可出售，价格与货币会直接同步到网页端详情和后台管理。" : "Antique shop products are always for sale, and their price and currency sync directly to the web detail page and admin.")
                                    : (language.language == .chinese ? "藏品展示默认只展示实力；如需开放咨询售价，可开启可出售并填写价格。" : "Collection display items are showcase-first; enable for-sale only when you want pricing to appear for buyer inquiry.")
                            )

                            lockedIdRow(fieldLabelCode, text: $draft.collectionId, generator: generateCollectionId, helper: collectionIdHelperText)

                            labeledField(language.language == .chinese ? "可售状态" : "Sale Status", helper: saleToggleHelperText) {
                                Toggle(isOn: Binding(
                                    get: { kind == .shop ? true : draft.isForSale },
                                    set: { draft.isForSale = $0 }
                                )) {
                                    Text(language.language == .chinese ? "标记为可出售" : "Mark as for sale")
                                }
                                .disabled(kind == .shop)
                            }

                            if kind == .shop || draft.isForSale {
                                labeledField(language.language == .chinese ? "价格" : "Price", required: true, helper: priceHelperText) {
                                    TextField(language.language == .chinese ? "价格" : "Price", text: $draft.price)
                                        .keyboardType(.decimalPad)
                                        .eastwoodInput()
                                }

                                labeledField(language.language == .chinese ? "货币" : "Currency", required: true, helper: currencyHelperText) {
                                    Picker(language.language == .chinese ? "货币" : "Currency", selection: $draft.currency) {
                                        Text("CNY").tag("CNY")
                                        Text("USD").tag("USD")
                                    }
                                    .pickerStyle(.segmented)
                                }
                            }
                        }
                    }
                }

                sectionCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(saveHelperText)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Button(seed == nil ? saveButtonTitle : editSaveTitle) {
                            Task { await save() }
                        }
                        .buttonStyle(EastwoodPrimaryButtonStyle())
                        .disabled(isSaving)

                        if seed != nil, let onDeleted {
                            Button(language.language == .chinese ? "删除当前内容" : "Delete This Item", role: .destructive) {
                                showingDeleteConfirm = true
                            }
                            .buttonStyle(EastwoodSecondaryButtonStyle())
                            .confirmationDialog(
                                language.language == .chinese ? "确认删除吗？" : "Delete this item?",
                                isPresented: $showingDeleteConfirm,
                                titleVisibility: .visible
                            ) {
                                Button(language.text("common.delete"), role: .destructive) {
                                    Task {
                                        do {
                                            try await onDeleted()
                                            dismiss()
                                        } catch {
                                            errorMessage = error.localizedDescription
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding(.vertical, 12)
        }
        .background(EastwoodBackground())
        .onAppear {
            if let seed {
                draft = NativeArtworkDraft(artwork: seed)
                existingRemoteImages = seed.galleryImages?.isEmpty == false ? (seed.galleryImages ?? []) : [seed.image]
            } else {
                if kind == .cases {
                    draft.caseId = generateCaseId()
                } else {
                    draft.collectionId = generateCollectionId()
                    draft.isForSale = kind == .shop
                }
            }
        }
        .onChange(of: pickerItems) { newItems in
            Task { await loadPickerItems(newItems) }
        }
    }

    private var imageCount: Int {
        existingRemoteImages.count + draft.images.count
    }

    private var previewAssets: [PreviewAsset] {
        existingRemoteImages.map { .remote($0) } + draft.images.map { .local($0) }
    }

    private func sectionCard<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .eastwoodPanel()
            .padding(.horizontal, EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width))
    }

    private func formChip(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(EastwoodTheme.gold)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(EastwoodTheme.gold.opacity(0.08), in: Capsule())
    }

    private func sectionHeading(title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.headline)
            Text(subtitle)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private func imageInfoPill(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.semibold))
                .foregroundStyle(EastwoodTheme.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.82), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 1)
        )
    }

    private func labeledField<Content: View>(
        _ title: String,
        required: Bool = false,
        helper: String? = nil,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                if required {
                    Text("*")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.red)
                }
            }
            if let helper, !helper.isEmpty {
                Text(helper)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            content()
        }
    }

    private var categoryOptions: [(value: String, label: String)] {
        [
            ("calligraphy", language.language == .chinese ? "字画" : "Paintings & Calligraphy"),
            ("misc", language.language == .chinese ? "杂项" : "Miscellaneous"),
            ("porcelain", language.language == .chinese ? "瓷器" : "Porcelain"),
            ("jade", language.language == .chinese ? "翡翠玉器" : "Jade"),
            ("bronze", language.language == .chinese ? "铜器" : "Bronze")
        ]
    }

    private var imageOverviewColumns: [GridItem] {
        let width = UIScreen.main.bounds.width
        if width < 390 {
            return [GridItem(.flexible()), GridItem(.flexible())]
        }
        return [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]
    }

    private var fieldLabelImages: String {
        switch kind {
        case .cases: return language.language == .chinese ? "案例图片" : "Case Images"
        case .collections: return language.language == .chinese ? "藏品图片" : "Collection Images"
        case .shop: return language.language == .chinese ? "商品图片" : "Product Images"
        }
    }

    private var fieldLabelTitle: String {
        switch kind {
        case .cases: return language.language == .chinese ? "案例名称" : "Case Name"
        case .collections: return language.language == .chinese ? "藏品名称" : "Collection Name"
        case .shop: return language.language == .chinese ? "商品名称" : "Product Name"
        }
    }

    private var fieldLabelCategory: String {
        language.language == .chinese ? "分类" : "Category"
    }

    private var fieldLabelPeriod: String {
        language.language == .chinese ? "时期 / 备注" : "Period / Note"
    }

    private var fieldLabelCode: String {
        kind == .cases
            ? (language.language == .chinese ? "案例编号" : "Case ID")
            : (language.language == .chinese ? "藏品编号" : "Collection ID")
    }

    private var fieldLabelSalePrice: String {
        language.language == .chinese ? "成交价格" : "Sale Price"
    }

    private var fieldLabelSaleTime: String {
        language.language == .chinese ? "成交时间" : "Sale Time"
    }

    private var fieldLabelSalePlatform: String {
        language.language == .chinese ? "成交平台" : "Sale Platform"
    }

    private var fieldLabelClientRegion: String {
        language.language == .chinese ? "客户地区" : "Client Region"
    }

    private var accessSummary: String {
        switch kind {
        case .cases:
            if auth.isAdmin {
                return language.language == .chinese ? "管理员模式：可以查看、编辑和删除全部回流案例；保存后会立即同步到 App 与网页后台。" : "Admin mode: you can review, edit, and delete every return case, and each save syncs immediately to both the app and web admin."
            }
            return language.language == .chinese ? "个人用户模式：您上传的回流案例会绑定当前账号，只能由您本人或管理员继续维护。" : "Personal user mode: uploaded return cases stay linked to your account and can be maintained by you or an admin."
        case .collections:
            if auth.isAdmin {
                return language.language == .chinese ? "管理员模式：可直接新建和维护藏品展示，数据与网页端藏品展示后台共用。" : "Admin mode: create and maintain collection display items directly, using the same dataset as the web collection admin."
            }
            return language.language == .chinese ? "普通用户可以继续管理自己历史上传的藏品展示内容，但不能新建新的官方藏品展示。" : "Regular users can continue maintaining previously uploaded collection display items, but cannot create new official showcase entries."
        case .shop:
            if auth.isAdmin {
                return language.language == .chinese ? "管理员模式：可直接发布和维护古董商店商品，价格、编号和图片会同步到网页商品详情。" : "Admin mode: publish and maintain antique shop products directly, with prices, IDs, and images syncing to the web product detail pages."
            }
            return language.language == .chinese ? "普通用户不能新建古董商店商品，但如果历史数据归属于当前账号，仍可继续维护。" : "Regular users cannot create new shop products, but may continue maintaining historical items already linked to their account."
        }
    }

    private var formIntro: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "多图上传、封面选择、案例编号和回流字段都将直接保存到云端。" : "Multi-image upload, cover selection, case ID, and return-case fields all save directly to the cloud."
        case .collections:
            return language.language == .chinese ? "这里的藏品展示数据与网页后台共用同一个 Supabase 数据源。" : "Collection display items here use the same Supabase-backed source as the web admin."
        case .shop:
            return language.language == .chinese ? "这里的商品数据与网页后台共用同一个 Supabase 数据源，并保留售价与编号。" : "Shop products here use the same Supabase-backed source as the web admin, including price and collection ID."
        }
    }

    private var imageHelperText: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "支持一次上传多张图片。首张会作为案例封面，建议包含整体图、局部图和成交相关参考图。" : "Upload multiple images at once. The first image becomes the case cover, so include an overall shot, close details, and any sale-reference images."
        case .collections:
            return language.language == .chinese ? "藏品展示支持多图上传，建议包含正面、背面、底款和细节局部，方便网页端同步展示。" : "Collection display supports multi-image upload. Include front, back, base mark, and detail shots so the web showcase has a complete gallery."
        case .shop:
            return language.language == .chinese ? "商品图会同步到古董商店详情页，建议至少上传主图、细节图和品相图。" : "Product photos sync to the antique shop detail page. Include at least a hero image, detail shots, and condition images."
        }
    }

    private var basicInfoHelper: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "先填写案例名称、分类、时期和说明，后续成交信息会单独记录在回流字段中。" : "Start with the case title, category, period, and narrative. Sale facts are recorded separately in the return-case fields below."
        case .collections:
            return language.language == .chinese ? "这里决定藏品展示卡片和详情页的基础文案，尽量和网页端展示口径保持一致。" : "These fields drive the core copy used on the collection cards and detail pages, so keep them aligned with the web presentation."
        case .shop:
            return language.language == .chinese ? "这里决定古董商店商品列表和详情页的基础展示信息，建议写清材质、年代和亮点。" : "These fields drive the product list and detail pages in the antique shop, so describe materials, era, and selling points clearly."
        }
    }

    private var titleHelperText: String {
        language.language == .chinese ? "这是列表卡片、详情页和后台管理里最主要的标题。" : "This is the primary title shown on cards, detail pages, and admin management views."
    }

    private var categoryHelperText: String {
        language.language == .chinese ? "分类会影响筛选和后台整理，尽量选择最接近的主类。" : "Category affects filtering and admin organization, so choose the closest primary type."
    }

    private var periodHelperText: String {
        language.language == .chinese ? "可填写朝代、年代、款识备注，或任何有助于前台展示的简短说明。" : "Use this for dynasty, era, inscription notes, or any short qualifier that improves buyer-facing display."
    }

    private var descriptionHelperText: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "补充案例背景、品相说明和成交上下文，方便后续咨询时快速引用。" : "Add background, condition notes, and sale context so future inquiries can reference the case quickly."
        case .collections:
            return language.language == .chinese ? "建议写清材质、尺寸、来源或研究价值，前台展示和后台管理都会使用这里的内容。" : "Describe materials, dimensions, provenance, or research value. Both the public display and internal management rely on this text."
        case .shop:
            return language.language == .chinese ? "建议写清材质、尺寸、状态、来源和购买亮点，方便买家咨询前快速判断。" : "Describe materials, dimensions, condition, provenance, and selling points so buyers can evaluate before inquiring."
        }
    }

    private var caseIdHelperText: String {
        language.language == .chinese ? "系统会自动生成唯一案例编号，发送咨询时会优先引用这里的编号。" : "The system generates a unique case ID automatically, and inquiries will reference this code first."
    }

    private var salePriceHelperText: String {
        language.language == .chinese ? "填写最终成交金额，可用 `¥50,000` 或 `USD 8,000` 这类直观格式。" : "Enter the final closed price in a readable format such as `¥50,000` or `USD 8,000`."
    }

    private var saleTimeHelperText: String {
        language.language == .chinese ? "可写成交日期或时间段，例如 `2025-10-08` 或 `2025 秋拍`。" : "Use a sale date or time window, for example `2025-10-08` or `Autumn 2025 auction`."
    }

    private var salePlatformHelperText: String {
        language.language == .chinese ? "记录成交发生的平台、拍卖行或渠道，方便后续案例追溯。" : "Record the platform, auction house, or channel where the transaction closed for future tracking."
    }

    private var clientRegionHelperText: String {
        language.language == .chinese ? "客户地区可帮助网页端展示案例流向，也方便后台做地域统计。" : "Buyer region helps explain case circulation on the web and supports region-level admin analysis."
    }

    private var logisticsHelperText: String {
        language.language == .chinese ? "如有运输、包装或保险成本，可在这里补充，便于复盘。" : "Add shipping, packing, or insurance costs here when you want them preserved for post-sale review."
    }

    private var purchaseChannelHelperText: String {
        language.language == .chinese ? "可写私人收藏、市场收购、拍卖回流等来源。" : "Use this for sourcing notes such as private collection, market acquisition, or auction return."
    }

    private var purchaseCostHelperText: String {
        language.language == .chinese ? "如果希望后台对比采购与成交情况，可以补充采购成本。" : "Add the acquisition cost when you want the admin side to compare sourcing cost against the final sale."
    }

    private var riskAdviceHelperText: String {
        language.language == .chinese ? "这里适合记录真假判断、品相风险、运输注意事项等经验提示。" : "Use this for authenticity judgment, condition risks, shipping cautions, or any practical advisory notes."
    }

    private var collectionIdHelperText: String {
        language.language == .chinese ? "系统会自动生成唯一编号，和网页版一样要求不可重复；买家咨询和后台管理都会使用这个编号。" : "The system generates a unique ID and, like the web app, it must stay unique. Buyer inquiries and admin workflows both rely on this code."
    }

    private var saleToggleHelperText: String {
        if kind == .shop {
            return language.language == .chinese ? "古董商店商品默认公开为可出售状态。" : "Antique shop products are always published as for-sale listings."
        }
        return language.language == .chinese ? "关闭后仅做展示，不显示公开售价；开启后会要求填写价格和货币。" : "When off, the item stays showcase-only without a public price. Turning it on requires price and currency."
    }

    private var priceHelperText: String {
        language.language == .chinese ? "前台商品详情和后台管理都将显示这里的价格，请填写正数。" : "This price appears in both the public detail page and admin management, so enter a positive numeric value."
    }

    private var currencyHelperText: String {
        language.language == .chinese ? "网页端和 app 会按这里的货币展示价格。" : "Both the web app and iOS app will present pricing using the currency chosen here."
    }

    private var saveHelperText: String {
        switch kind {
        case .cases:
            return language.language == .chinese ? "保存后会立即写入 Supabase，并同步到回流案例列表、详情页和后台管理。" : "Saving writes directly to Supabase and immediately updates the return-case list, detail page, and admin management."
        case .collections:
            return language.language == .chinese ? "保存后会立即同步到藏品展示页面和网页后台；如有编号咨询，用户会看到最新内容。" : "Saving immediately syncs to the collection display pages and web admin, so any inquiry tied to this item sees the latest content."
        case .shop:
            return language.language == .chinese ? "保存后会立即同步到古董商店前台与后台，售价、图片和编号都会一起更新。" : "Saving immediately syncs to the antique shop front end and admin, including pricing, imagery, and collection ID."
        }
    }

    private var saveButtonTitle: String {
        language.language == .chinese ? "保存到云端" : "Save to Cloud"
    }

    private var editSaveTitle: String {
        language.language == .chinese ? "保存修改" : "Save Changes"
    }

    private func optionalLabel(_ text: String) -> String {
        language.language == .chinese ? "\(text)（可选）" : "\(text) (Optional)"
    }

    private func lockedIdRow(_ title: String, text: Binding<String>, generator: @escaping () -> String, helper: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text("*")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.red)
            }
            if let helper, !helper.isEmpty {
                Text(helper)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            HStack {
                TextField(title, text: text)
                    .disabled(true)
                    .eastwoodInput()
                Button(language.language == .chinese ? "重新生成" : "Regenerate") {
                    text.wrappedValue = generator()
                }
                .buttonStyle(EastwoodSecondaryButtonStyle())
            }
        }
    }

    private func loadPickerItems(_ items: [PhotosPickerItem]) async {
        guard !items.isEmpty else { return }
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                draft.images.append(image)
            }
        }
        pickerItems = []
    }

    private func removeImage(at index: Int) {
        if index < existingRemoteImages.count {
            existingRemoteImages.remove(at: index)
        } else {
            let localIndex = index - existingRemoteImages.count
            if draft.images.indices.contains(localIndex) {
                draft.images.remove(at: localIndex)
            }
        }
        draft.coverIndex = min(draft.coverIndex, max(imageCount - 1, 0))
    }

    @ViewBuilder
    private func previewTile(asset: PreviewAsset, index: Int) -> some View {
        Group {
            switch asset {
            case .remote(let url):
                AsyncImage(url: URL(string: url)) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .empty:
                        ZStack { EastwoodTheme.panelSoft; ProgressView() }
                    case .failure:
                        ZStack { EastwoodTheme.panelSoft; Image(systemName: "photo") }
                    @unknown default:
                        EastwoodTheme.panelSoft
                    }
                }
            case .local(let image):
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            }
        }
        .frame(width: 92, height: 92)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(draft.coverIndex == index ? EastwoodTheme.gold : EastwoodTheme.hairline, lineWidth: draft.coverIndex == index ? 2 : 1)
        )
        .onTapGesture { draft.coverIndex = index }
    }

    private func save() async {
        guard !isSaving else { return }
        errorMessage = nil

        let trimmedTitle = draft.title.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedTitle.isEmpty {
            errorMessage = language.language == .chinese ? "请填写名称。" : "Please enter a title."
            return
        }

        let mergedGallery = try? buildGalleryPayload()
        guard let galleryPayload = mergedGallery, !galleryPayload.isEmpty else {
            errorMessage = language.language == .chinese ? "请至少选择一张图片。" : "Please choose at least one image."
            return
        }

        if kind == .cases {
            if draft.salePrice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                draft.saleTime.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                draft.salePlatform.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                errorMessage = language.language == .chinese ? "请补全成交价格、时间和平台。" : "Please complete sale price, time, and platform."
                return
            }
        } else {
            let normalizedCollectionID = draft.collectionId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            if normalizedCollectionID.isEmpty {
                errorMessage = language.language == .chinese ? "请保留藏品编号。" : "Please keep the collection ID."
                return
            }
            let duplicate = visibleArtworks.contains {
                $0.id != seed?.id &&
                ($0.collectionId?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == normalizedCollectionID)
            }
            if duplicate {
                errorMessage = language.language == .chinese ? "该藏品编号已存在，请重新生成。" : "That collection ID already exists. Please regenerate it."
                return
            }
        }

        if kind == .shop || draft.isForSale {
            guard let parsedPrice = Double(draft.price), parsedPrice > 0 else {
                errorMessage = language.language == .chinese ? "请填写有效价格。" : "Please enter a valid price."
                return
            }
            _ = parsedPrice
        }

        isSaving = true
        defer { isSaving = false }

        do {
            let payload = try buildPayload(galleryPayload: galleryPayload)
            try await onSaved(payload)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func buildGalleryPayload() throws -> [String] {
        var gallery = existingRemoteImages
        gallery.append(contentsOf: try draft.images.map(dataURL(from:)))
        if !gallery.isEmpty, draft.coverIndex < gallery.count, draft.coverIndex > 0 {
            let cover = gallery.remove(at: draft.coverIndex)
            gallery.insert(cover, at: 0)
        }
        return gallery
    }

    private func buildPayload(galleryPayload: [String]) throws -> [String: Any] {
        let cover = galleryPayload[0]
        let listingType: String
        switch kind {
        case .cases, .shop:
            listingType = "product"
        case .collections:
            listingType = "collection"
        }

        var payload: [String: Any] = [
            "id": seed?.id ?? UUID().uuidString,
            "title": draft.title.trimmingCharacters(in: .whitespacesAndNewlines),
            "category": draft.category,
            "period": draft.period.trimmingCharacters(in: .whitespacesAndNewlines),
            "image": cover,
            "galleryImages": galleryPayload,
            "description": draft.description.trimmingCharacters(in: .whitespacesAndNewlines),
            "listingType": listingType,
            "featureVector": [0, 0, 0, 0, 0, 0, 0, 0],
            "titleZh": NSNull(),
            "categoryZh": NSNull(),
            "periodZh": NSNull(),
            "descriptionZh": NSNull(),
            "uploadedBy": seed?.uploadedBy ?? auth.currentUserId,
            "isOfficial": auth.isAdmin,
        ]

        switch kind {
        case .cases:
            payload["isForSale"] = false
            payload["price"] = NSNull()
            payload["currency"] = NSNull()
            payload["collectionId"] = NSNull()
            payload["caseRecord"] = [
                "caseId": draft.caseId,
                "salePrice": draft.salePrice,
                "saleTime": draft.saleTime,
                "salePlatform": draft.salePlatform,
                "clientRegion": draft.clientRegion,
                "logisticsCost": draft.logisticsCost,
                "purchaseChannel": draft.purchaseChannel,
                "purchaseCost": draft.purchaseCost,
                "riskAdvice": draft.riskAdvice,
            ]
        case .collections, .shop:
            let forSale = kind == .shop ? true : draft.isForSale
            payload["isForSale"] = forSale
            if forSale, let parsedPrice = Double(draft.price) {
                payload["price"] = parsedPrice
                payload["currency"] = draft.currency
            } else {
                payload["price"] = NSNull()
                payload["currency"] = NSNull()
            }
            payload["collectionId"] = draft.collectionId
            payload["caseRecord"] = NSNull()
        }

        return payload
    }

    private func dataURL(from image: UIImage) throws -> String {
        guard let data = image.jpegData(compressionQuality: 0.86) else {
            throw APIClientError.server(language.language == .chinese ? "图片转换失败。" : "Failed to convert image.")
        }
        return "data:image/jpeg;base64,\(data.base64EncodedString())"
    }

    private func generateCollectionId() -> String {
        let now = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "MMddyy"
        let date = formatter.string(from: now)
        let letters = String((0..<2).map { _ in "ABCDEFGHIJKLMNOPQRSTUVWXYZ".randomElement()! })
        let digits = String(Int.random(in: 10...99))
        return "COL-\(date)-\(letters)\(digits)"
    }

    private func generateCaseId() -> String {
        let now = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "MMddyy"
        let date = formatter.string(from: now)
        let letters = String((0..<2).map { _ in "ABCDEFGHIJKLMNOPQRSTUVWXYZ".randomElement()! })
        let digits = String(Int.random(in: 10...99))
        return "CASE-\(date)-\(letters)\(digits)"
    }
}
