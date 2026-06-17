import SwiftUI
import UIKit

private enum AppTab: String, CaseIterable {
    case home, discover, shop, cases, profile

    var icon: String {
        switch self {
        case .home: "house.fill"; case .discover: "square.grid.2x2.fill"
        case .shop: "bag.fill"; case .cases: "arrow.triangle.2.circlepath"
        case .profile: "person.fill"
        }
    }
    var iconUnfilled: String {
        switch self {
        case .home: "house"; case .discover: "square.grid.2x2"
        case .shop: "bag"; case .cases: "arrow.triangle.2.circlepath"
        case .profile: "person"
        }
    }
}

struct ContentView: View {
    @EnvironmentObject private var language: LanguageManager
    @StateObject private var vm = NativeHomeViewModel()
    @StateObject private var auth = AuthManager()
    @StateObject private var favorites = FavoritesManager()
    @State private var selectedTab: AppTab = .home
    @State private var showSessionExpiredAlert = false
    @State private var homeFeedStyle: HomeFeedStyle = .waterfall

    private enum HomeFeedStyle { case waterfall, large }

    var body: some View {
        ZStack(alignment: .bottom) {
            tabContent.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            floatingTabBar.padding(.horizontal, 16).padding(.bottom, 4).ignoresSafeArea(edges: .bottom)
        }
        .background(EastwoodBackground())
        .environmentObject(auth).environmentObject(favorites)
        .tint(EastwoodTheme.gold)
        .task { await vm.load() }
        .onChange(of: auth.accessToken) { newValue in
            Task {
                if newValue.isEmpty { favorites.clear() }
                else { await auth.refreshRole(); await favorites.load(token: newValue) }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .eastwoodAuthExpired)) { _ in
            guard auth.isAuthenticated else { return }; auth.signOut(); showSessionExpiredAlert = true
        }
        .onChange(of: selectedTab) { _ in UIImpactFeedbackGenerator(style: .soft).impactOccurred() }
        .alert(language.text("alert.sessionExpired.title"), isPresented: $showSessionExpiredAlert) {
            Button(language.text("common.ok"), role: .cancel) {}
        } message: { Text(language.text("alert.sessionExpired.message")) }
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .home:
            NavigationStack {
                homeTab
                    .navigationTitle("").navigationBarTitleDisplayMode(.inline)
                    .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
                    .toolbar { homeToolbar }
            }
        case .discover:
            NavigationStack { NativeSectionView(kind: .collections, artworks: vm.artworks, onCatalogChanged: { Task { await vm.load() } }) }
        case .shop:
            NavigationStack { NativeSectionView(kind: .shop, artworks: vm.artworks, onCatalogChanged: { Task { await vm.load() } }) }
        case .cases:
            NavigationStack { NativeSectionView(kind: .cases, artworks: vm.artworks, onCatalogChanged: { Task { await vm.load() } }) }
        case .profile:
            NavigationStack { NativeProfileRootView(artworks: vm.artworks) }
        }
    }

    @ToolbarContentBuilder
    private var homeToolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Text(language.text("common.brand"))
                .font(.system(size: 18, weight: .bold, design: .serif)).foregroundStyle(EastwoodTheme.ink)
        }
        ToolbarItem(placement: .topBarTrailing) {
            HStack(spacing: 16) {
                NavigationLink { NativeImageSearchView() } label: {
                    Image(systemName: "camera.viewfinder").font(.system(size: 17, weight: .medium)).foregroundStyle(EastwoodTheme.gold)
                }
                NavigationLink { NativeSearchView(artworks: vm.artworks) } label: {
                    Image(systemName: "magnifyingglass").font(.system(size: 17, weight: .medium)).foregroundStyle(EastwoodTheme.gold)
                }
            }
        }
    }

    // MARK: - Home Tab

    private var homeTab: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                homeHeroCard.padding(.horizontal, pad)
                homeQuickStats.padding(.horizontal, pad)

                // Quick actions row
                quickActionsRow.padding(.horizontal, pad)

                // Featured carousel — horizontal scroll
                if !vm.artworks.isEmpty {
                    featuredCarousel
                        .padding(.leading, pad)
                }

                // Category browser
                categoryBrowser.padding(.horizontal, pad)

                // Feed section
                feedSectionHeader.padding(.horizontal, pad)

                if let error = vm.errorMessage, vm.artworks.isEmpty {
                    EastwoodStateView(systemImage: "wifi.exclamationmark",
                        title: language.text("state.unableToLoad"), message: error,
                        buttonTitle: language.text("common.retry"),
                        onTap: { Task { await vm.load() } }).padding(.horizontal, pad)
                } else if vm.isLoading && vm.artworks.isEmpty {
                    skeletonFeed.padding(.horizontal, pad)
                } else if vm.artworks.isEmpty {
                    EastwoodStateView(systemImage: "shippingbox",
                        title: language.text("home.emptyTitle"),
                        message: language.text("home.emptyMessage")).padding(.horizontal, pad)
                } else {
                    switch homeFeedStyle {
                    case .waterfall: waterfallFeed.padding(.horizontal, pad)
                    case .large: largeCardFeed.padding(.horizontal, pad)
                    }
                }
            }
            .padding(.vertical, 12)
        }
        .scrollIndicators(.hidden)
        .animation(EastwoodMotion.listUpdate, value: vm.artworks.count)
        .refreshable { await vm.load() }
        .background(EastwoodBackground())
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Hero Card

    private var homeHeroCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                if let first = vm.artworks.first {
                    AsyncImage(url: first.imageURL) { phase in
                        switch phase {
                        case .success(let img): img.resizable().scaledToFill()
                        case .empty: Rectangle().fill(EastwoodTheme.panelSoft).overlay(ProgressView().tint(EastwoodTheme.gold))
                        case .failure: Rectangle().fill(EastwoodTheme.panelSoft).overlay(Image(systemName: "photo").font(.title).foregroundStyle(EastwoodTheme.mutedText))
                        @unknown default: Rectangle().fill(EastwoodTheme.panelSoft)
                        }
                    }.frame(height: 240).clipped()
                } else {
                    Rectangle().fill(EastwoodTheme.panelSoft).frame(height: 240)
                        .overlay(Image(systemName: "photo.on.rectangle.angled").font(.system(size: 40)).foregroundStyle(EastwoodTheme.mutedText))
                }
                LinearGradient(colors: [Color.clear, Color.black.opacity(0.45)], startPoint: .center, endPoint: .bottom)
                VStack(alignment: .leading, spacing: 4) {
                    Text(language.text("home.featured")).font(.caption.weight(.bold)).foregroundStyle(EastwoodTheme.goldLight).tracking(1.2)
                    Text(language.text("common.brand")).font(.system(size: 26, weight: .bold, design: .serif)).foregroundStyle(.white)
                    Text(language.text("home.hero.subtitle")).font(.caption).foregroundStyle(.white.opacity(0.8)).lineLimit(2)
                }.padding(20)
            }
            HStack(spacing: 12) {
                ForEach([
                    (lang("藏品","Collection"), "\(vm.artworks.filter{$0.listingType=="collection"}.count)", EastwoodTheme.collectionsAccent),
                    (lang("在售","Shop"), "\(vm.artworks.filter{$0.listingType=="product"||$0.isForSale==true}.count)", EastwoodTheme.shopAccent),
                    (lang("案例","Cases"), "\(vm.artworks.filter{$0.caseRecord != nil}.count)", EastwoodTheme.casesAccent),
                ], id: \.0) { item in
                    HStack(spacing: 6) {
                        Circle().fill(item.2).frame(width: 8, height: 8)
                        Text(item.0).font(.caption2).foregroundStyle(.secondary)
                        Text(item.1).font(.system(size: 16, weight: .bold, design: .rounded)).foregroundStyle(EastwoodTheme.inkSoft)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
            }.padding(.horizontal, 16).padding(.vertical, 14)
        }
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(EastwoodTheme.panel))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: EastwoodTheme.shadowCard, radius: 12, y: 4)
    }

    // MARK: - Quick Actions

    private var quickActionsRow: some View {
        HStack(spacing: 10) {
            quickActionButton(title: language.text("home.browseShop"), icon: "bag.fill", accent: EastwoodTheme.shopAccent) {
                selectedTab = .shop
            }
            quickActionButton(title: language.text("home.startSearch"), icon: "magnifyingglass", accent: EastwoodTheme.collectionsAccent) {
                // handled by NavigationLink in toolbar
            }
            quickActionButton(title: language.text("home.tryImageSearch"), icon: "camera.viewfinder", accent: EastwoodTheme.gold) {}
        }
    }

    private func quickActionButton(title: String, icon: String, accent: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(accent.opacity(0.10))
                    .frame(width: 48, height: 48)
                    .overlay(Image(systemName: icon).font(.system(size: 18, weight: .medium)).foregroundStyle(accent))
                Text(title).font(.caption.weight(.medium)).foregroundStyle(EastwoodTheme.ink).lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(EastwoodTheme.panel))
            .shadow(color: Color.black.opacity(0.03), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
    }

    private func lang(_ zh: String, _ en: String) -> String {
        language.language == .chinese ? zh : en
    }

    // MARK: - Featured Carousel

    private var featuredCarousel: some View {
        let items = vm.artworks.shuffled().prefix(6)

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(language.text("home.featuredSection"))
                        .font(.system(size: 18, weight: .bold, design: .serif)).foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("home.featuredSection.subtitle"))
                        .font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(Array(items)) { artwork in
                        NavigationLink(value: artwork) {
                            featuredCard(artwork)
                        }.buttonStyle(.plain)
                    }
                }
                .padding(.trailing, EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width))
            }
        }
    }

    private func featuredCard(_ artwork: NativeArtwork) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            AsyncImage(url: artwork.imageURL) { phase in
                switch phase {
                case .success(let img): img.resizable().scaledToFill()
                case .empty: Rectangle().fill(EastwoodTheme.panelSoft).overlay(ProgressView().tint(EastwoodTheme.gold))
                case .failure: Rectangle().fill(EastwoodTheme.panelSoft).overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                @unknown default: Rectangle().fill(EastwoodTheme.panelSoft)
                }
            }
            .frame(width: 156, height: 130).clipped()

            VStack(alignment: .leading, spacing: 3) {
                Text(artwork.displayTitle(in: language.language))
                    .font(.system(size: 12, weight: .medium)).foregroundStyle(EastwoodTheme.inkSoft).lineLimit(1)
                HStack(spacing: 4) {
                    if artwork.isForSale == true {
                        Circle().fill(EastwoodTheme.redAccent).frame(width: 5, height: 5)
                        Text(language.text("artwork.forSale"))
                            .font(.system(size: 10, weight: .bold)).foregroundStyle(EastwoodTheme.redAccent)
                    }
                    Text(artwork.displayCategory(in: language.language))
                        .font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
                }
            }
            .padding(.horizontal, 8).padding(.vertical, 8)
        }
        .frame(width: 156)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(EastwoodTheme.panel))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: EastwoodTheme.shadowLight, radius: 4, y: 2)
    }

    // MARK: - Category Browser

    private let quickCategories: [(String, String, Color)] = [
        ("category.porcelain", "cup.and.saucer.fill", EastwoodTheme.collectionsAccent),
        ("category.jade", "sparkles", EastwoodTheme.casesAccent),
        ("category.calligraphy", "paintbrush.fill", EastwoodTheme.gold),
        ("category.bronze", "shield.fill", EastwoodTheme.shopAccent),
        ("category.misc", "square.grid.2x2.fill", EastwoodTheme.collectionsAccent),
    ]

    private var categoryBrowser: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(language.text("home.browseCategories"))
                        .font(.system(size: 18, weight: .bold, design: .serif)).foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("home.browseCategories.subtitle"))
                        .font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                NavigationLink {
                    NativeSectionView(kind: .collections, artworks: vm.artworks, onCatalogChanged: { Task { await vm.load() } })
                } label: {
                    Text(language.text("category.all")).font(.caption.weight(.semibold)).foregroundStyle(EastwoodTheme.gold)
                }
            }

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 10)], spacing: 10) {
                ForEach(quickCategories, id: \.0) { cat in
                    NavigationLink {
                        NativeSectionView(kind: .collections, artworks: vm.artworks, onCatalogChanged: { Task { await vm.load() } })
                    } label: {
                        VStack(spacing: 8) {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(cat.2.opacity(0.10))
                                .frame(width: 52, height: 52)
                                .overlay(Image(systemName: cat.1).font(.system(size: 20, weight: .medium)).foregroundStyle(cat.2))
                            Text(language.text(cat.0)).font(.caption.weight(.medium)).foregroundStyle(EastwoodTheme.ink)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(EastwoodTheme.panel))
                        .shadow(color: Color.black.opacity(0.03), radius: 4, y: 2)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Quick Stats

    private var homeQuickStats: some View {
        HStack(spacing: 10) {
            quickStat(title: language.text("home.artworks"), value: "\(vm.artworks.count)", icon: "square.grid.2x2", accent: EastwoodTheme.collectionsAccent)
            quickStat(title: language.text("home.shop"), value: "\(vm.artworks.filter{$0.listingType=="product"||$0.isForSale==true}.count)", icon: "bag", accent: EastwoodTheme.shopAccent)
            quickStat(title: language.text("home.cases"), value: "\(vm.artworks.filter{$0.caseRecord != nil}.count)", icon: "arrow.triangle.2.circlepath", accent: EastwoodTheme.casesAccent)
        }
    }

    private func quickStat(title: String, value: String, icon: String, accent: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon).font(.system(size: 15, weight: .medium)).foregroundStyle(accent)
                .frame(width: 36, height: 36).background(accent.opacity(0.10), in: Circle())
            Text(value).font(.system(size: 20, weight: .bold, design: .rounded)).foregroundStyle(EastwoodTheme.ink)
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 14).eastwoodPanel()
    }

    // MARK: - Feed Section

    private var feedSectionHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(language.text("home.latestHighlights"))
                    .font(.system(size: 20, weight: .bold, design: .serif)).foregroundStyle(EastwoodTheme.ink)
                Text(language.language == .chinese ? "浏览最新藏品、古董商店与回流案例" : "Browse the latest pieces, shop objects & cases")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            HStack(spacing: 4) {
                feedStyleButton(.waterfall, icon: "square.grid.2x2")
                feedStyleButton(.large, icon: "rectangle.portrait.on.rectangle.portrait")
            }
            .padding(4).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(EastwoodTheme.panelSoft))
        }
    }

    private func feedStyleButton(_ style: HomeFeedStyle, icon: String) -> some View {
        Button { withAnimation(EastwoodMotion.listUpdate) { homeFeedStyle = style } } label: {
            Image(systemName: icon).font(.system(size: 14, weight: .medium))
                .foregroundStyle(homeFeedStyle == style ? EastwoodTheme.gold : EastwoodTheme.mutedText)
                .padding(8).background(RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(homeFeedStyle == style ? EastwoodTheme.panel : Color.clear))
        }
    }

    // MARK: - Feeds

    private var waterfallFeed: some View {
        HStack(alignment: .top, spacing: 10) {
            LazyVStack(spacing: 10) {
                ForEach(homeWaterfallColumns.left) { artwork in
                    NavigationLink(value: artwork) {
                        NativeArtworkCompactCard(artwork: artwork, showsCode: false, showsPrice: true, displayStyle: .homeFeed, imageHeightOverride: homeFeedImageHeight(for: artwork))
                    }.buttonStyle(.plain)
                }
            }
            LazyVStack(spacing: 10) {
                ForEach(homeWaterfallColumns.right) { artwork in
                    NavigationLink(value: artwork) {
                        NativeArtworkCompactCard(artwork: artwork, showsCode: false, showsPrice: true, displayStyle: .homeFeed, imageHeightOverride: homeFeedImageHeight(for: artwork))
                    }.buttonStyle(.plain)
                }
            }
        }
    }

    private var largeCardFeed: some View {
        LazyVStack(spacing: 14) {
            ForEach(vm.artworks.prefix(10)) { artwork in
                NavigationLink(value: artwork) { NativeArtworkListRow(artwork: artwork) }.buttonStyle(.plain)
            }
        }
    }

    private var skeletonFeed: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
            ForEach(0..<6, id: \.self) { _ in EastwoodCompactSkeletonCard() }
        }
    }

    private var homeFeedItems: [NativeArtwork] { Array(vm.artworks.prefix(10)) }

    private var homeWaterfallColumns: (left: [NativeArtwork], right: [NativeArtwork]) {
        var left: [NativeArtwork] = [], right: [NativeArtwork] = []
        for (i, item) in homeFeedItems.enumerated() {
            if i.isMultiple(of: 2) { left.append(item) } else { right.append(item) }
        }
        return (left, right)
    }

    private func homeFeedImageHeight(for a: NativeArtwork) -> CGFloat {
        let colWidth = (UIScreen.main.bounds.width - 28) / 2  // account for padding + spacing
        if a.caseRecord != nil { return colWidth * 1.05 }
        if a.isForSale == true || a.listingType == "product" { return colWidth * 1.0 }
        return colWidth * 1.10
    }

    // MARK: - Floating Tab Bar

    private var floatingTabBar: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases, id: \.self) { tab in tabButton(tab) }
        }
        .padding(.horizontal, 6).padding(.vertical, 6)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(EastwoodTheme.hairline, lineWidth: 0.5))
        .shadow(color: Color.black.opacity(0.06), radius: 12, y: 4)
    }

    private func tabButton(_ tab: AppTab) -> some View {
        Button { guard selectedTab != tab else { return }; selectedTab = tab } label: {
            VStack(spacing: 3) {
                Image(systemName: selectedTab == tab ? tab.icon : tab.iconUnfilled)
                    .font(.system(size: 20, weight: .medium)).frame(height: 24)
                Text(tabTitle(tab)).font(.system(size: 10, weight: selectedTab == tab ? .semibold : .medium))
            }
            .frame(maxWidth: .infinity)
            .foregroundStyle(selectedTab == tab ? EastwoodTheme.gold : EastwoodTheme.mutedText)
            .padding(.vertical, 4)
            .background {
                if selectedTab == tab {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(EastwoodTheme.panel.opacity(0.92))
                        .shadow(color: EastwoodTheme.gold.opacity(0.12), radius: 6, y: 2)
                }
            }
        }.buttonStyle(.plain)
    }

    private func tabTitle(_ tab: AppTab) -> String {
        switch tab {
        case .home: language.text("tab.home")
        case .discover: language.text("tab.collections")
        case .shop: language.text("tab.shop")
        case .cases: language.text("tab.cases")
        case .profile: language.language == .chinese ? "我的" : "Me"
        }
    }
}

#Preview { ContentView().environmentObject(LanguageManager()) }
