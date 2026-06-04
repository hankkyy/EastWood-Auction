import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var language: LanguageManager

    private enum MainTab: Hashable {
        case home, collections, shop, cases, more
    }

    @StateObject private var vm = NativeHomeViewModel()
    @StateObject private var auth = AuthManager()
    @StateObject private var favorites = FavoritesManager()
    @State private var showSessionExpiredAlert = false
    @State private var selectedTab: MainTab = .home
    @State private var homePreviewMode: HomePreviewMode = .cards

    private enum HomePreviewMode: String {
        case cards
        case list
    }

    private struct HomePreviewSection: Identifiable {
        let id: MainTab
        let title: String
        let subtitle: String
        let accent: Color
        let icon: String
        let items: [NativeArtwork]
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            NavigationStack {
                ZStack {
                    selectedTabContent
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .background(EastwoodBackground())
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    Color.clear.frame(height: 54)
                }
                .navigationTitle(tabTitle(for: selectedTab))
                .navigationBarTitleDisplayMode(.inline)
                .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
                .toolbar {
                    if selectedTab == .home {
                        ToolbarItem(placement: .topBarTrailing) {
                            NavigationLink {
                                NativeSearchView(artworks: vm.artworks)
                            } label: {
                                Image(systemName: "magnifyingglass")
                            }
                        }
                    }
                }
            }

            bottomTabBar
                .padding(.horizontal, 10)
                .padding(.bottom, -6)
                .ignoresSafeArea(edges: .bottom)
        }
        .background(EastwoodBackground())
        .environmentObject(auth)
        .environmentObject(favorites)
        .tint(EastwoodTheme.gold)
        .task { await vm.load() }
        .onChange(of: auth.accessToken) { newValue in
            Task {
                if newValue.isEmpty {
                    favorites.clear()
                } else {
                    await auth.refreshRole()
                    await favorites.load(token: newValue)
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .eastwoodAuthExpired)) { _ in
            guard auth.isAuthenticated else { return }
            auth.signOut()
            showSessionExpiredAlert = true
        }
        .onChange(of: selectedTab) { _ in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
        .alert(language.text("alert.sessionExpired.title"), isPresented: $showSessionExpiredAlert) {
            Button(language.text("common.ok"), role: .cancel) {}
        } message: {
            Text(language.text("alert.sessionExpired.message"))
        }
    }

    @ViewBuilder
    private var selectedTabContent: some View {
        switch selectedTab {
        case .home:
            homeTab
        case .collections:
            NavigationStack { NativeSectionView(kind: .collections, artworks: vm.artworks, onCatalogChanged: { Task { await vm.load() } }) }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        case .shop:
            NavigationStack { NativeSectionView(kind: .shop, artworks: vm.artworks, onCatalogChanged: { Task { await vm.load() } }) }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        case .cases:
            NavigationStack { NativeSectionView(kind: .cases, artworks: vm.artworks, onCatalogChanged: { Task { await vm.load() } }) }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        case .more:
            NativeMoreView(artworks: vm.artworks)
        }
    }

    private var bottomTabBar: some View {
        HStack(spacing: 0) {
            tabButton(.home, language.text("tab.home"), "house.fill")
            tabButton(.collections, language.text("tab.collections"), "square.grid.2x2.fill")
            tabButton(.shop, language.text("tab.shop"), "bag.fill")
            tabButton(.cases, language.text("tab.cases"), "arrow.triangle.2.circlepath")
            tabButton(.more, language.text("tab.more"), "ellipsis.circle.fill")
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
    }

    private func tabButton(_ tab: MainTab, _ title: String, _ systemImage: String) -> some View {
        Button {
            guard selectedTab != tab else { return }
            selectedTab = tab
        } label: {
            VStack(spacing: 2) {
                Image(systemName: systemImage)
                    .font(.system(size: 18, weight: .semibold))
                Text(title)
                    .font(.caption2.weight(.semibold))
            }
            .frame(maxWidth: .infinity)
            .foregroundStyle(selectedTab == tab ? EastwoodTheme.gold : EastwoodTheme.mutedText)
            .padding(.vertical, 3)
            .background {
                if selectedTab == tab {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white.opacity(0.92))
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var homeTab: some View {
        let pagePad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        return ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                homeHero
                    .padding(.horizontal, pagePad)

                homeStats
                    .padding(.horizontal, pagePad)

                if let error = vm.errorMessage, vm.artworks.isEmpty {
                    EastwoodStateView(
                        systemImage: "wifi.exclamationmark",
                        title: language.text("state.unableToLoad"),
                        message: error,
                        buttonTitle: language.text("common.retry"),
                        onTap: { Task { await vm.load() } }
                    )
                } else if vm.isLoading && vm.artworks.isEmpty {
                    if homePreviewMode == .cards {
                        let columns = [
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12),
                        ]
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(0..<6, id: \.self) { _ in
                                EastwoodCompactSkeletonCard()
                            }
                        }
                        .padding(.horizontal, pagePad)
                    } else {
                        EastwoodSkeletonList(count: 4)
                            .padding(.horizontal, pagePad)
                    }
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(language.text("home.latestHighlights"))
                                    .font(.system(size: 22, weight: .bold, design: .serif))
                                Text(language.language == .chinese ? "小巧预览，快速浏览最新藏品与案例。" : "Compact previews for the latest objects, shop lots, and cases.")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            previewModePicker
                        }
                        .padding(.horizontal, pagePad)

                        if homePreviewMode == .cards {
                            homePreviewWall
                                .padding(.horizontal, pagePad)
                        } else {
                            LazyVStack(spacing: 12) {
                                ForEach(vm.artworks.prefix(8)) { artwork in
                                    NavigationLink(value: artwork) {
                                        NativeArtworkListRow(artwork: artwork)
                                    }
                                    .buttonStyle(.plain)
                                    .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                                }
                            }
                            .padding(.horizontal, pagePad)
                        }
                    }
                }
            }
            .padding(.vertical, 10)
        }
        .scrollIndicators(.hidden)
        .animation(EastwoodMotion.listUpdate, value: vm.artworks.count)
        .refreshable { await vm.load() }
        .background(EastwoodBackground())
        .eastwoodEnterMotion(id: "home-tab")
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private var homeHero: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(language.text("home.featured"))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(sectionAccent(.collections).opacity(0.88))
                        .tracking(1)
                    Text(language.text("common.brand"))
                        .font(.system(size: 28, weight: .bold, design: .serif))
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("home.hero.subtitle"))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Spacer(minLength: 12)
                VStack(spacing: 8) {
                    Circle()
                        .fill(EastwoodTheme.panelSoft)
                        .frame(width: 44, height: 44)
                        .overlay(
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(EastwoodTheme.gold)
                        )
                    Text(language.language == .chinese ? "搜索" : "Search")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 8) {
                pill(language.text("home.pill.curated"))
                pill(language.text("home.pill.cloud"))
                pill(language.text("home.pill.native"))
            }

            HStack(spacing: 8) {
                featuredMetric(
                    title: language.language == .chinese ? "展示" : "Display",
                    value: "\(vm.artworks.filter { $0.listingType == "collection" }.count)",
                    accent: sectionAccent(.collections)
                )
                featuredMetric(
                    title: language.language == .chinese ? "在售" : "Shop",
                    value: "\(vm.artworks.filter { $0.listingType == "product" || $0.isForSale == true }.count)",
                    accent: sectionAccent(.shop)
                )
                featuredMetric(
                    title: language.language == .chinese ? "案例" : "Cases",
                    value: "\(vm.artworks.filter { $0.caseRecord != nil }.count)",
                    accent: sectionAccent(.cases)
                )
            }
        }
        .padding(14)
        .background(
            LinearGradient(
                colors: [
                    Color.white.opacity(0.98),
                    EastwoodTheme.ivory,
                    EastwoodTheme.mistBlue.opacity(0.10)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 20, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 1)
        )
        .shadow(color: EastwoodTheme.gold.opacity(0.06), radius: 14, y: 6)
    }

    private var homePreviewWall: some View {
        VStack(spacing: 14) {
            ForEach(homePreviewSections) { section in
                homePreviewSection(section)
            }
        }
    }

    private func homePreviewSection(_ section: HomePreviewSection) -> some View {
        let columns = [
            GridItem(.flexible(), spacing: 12),
            GridItem(.flexible(), spacing: 12),
        ]
        let cardHeight = EastwoodLayout.compactCardHeight(for: UIScreen.main.bounds.width)

        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(section.accent.opacity(0.12))
                            .frame(width: 24, height: 24)
                            .overlay(
                                Image(systemName: section.icon)
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(section.accent)
                            )
                        Text(section.title)
                            .font(.system(size: 18, weight: .bold, design: .serif))
                            .foregroundStyle(EastwoodTheme.ink)
                    }
                    Text(section.subtitle)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 10)

                Button {
                    selectedTab = section.id
                } label: {
                    Text(language.language == .chinese ? "查看全部" : "View All")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(section.accent)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.9), in: Capsule())
                        .overlay(
                            Capsule()
                                .stroke(section.accent.opacity(0.18), lineWidth: 1)
                        )
                }
            }

            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(section.items) { artwork in
                    NavigationLink(value: artwork) {
                        NativeArtworkCompactCard(artwork: artwork)
                    }
                    .buttonStyle(.plain)
                    .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                }

                Button {
                    selectedTab = section.id
                } label: {
                    VStack(spacing: 7) {
                        Text("...")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundStyle(section.accent.opacity(0.9))
                        Text(language.language == .chinese ? "进入专区" : "Open Section")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(EastwoodTheme.ink)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: cardHeight)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(EastwoodTheme.ivory.opacity(0.92))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(style: StrokeStyle(lineWidth: 1.5, dash: [6, 6]))
                            .foregroundStyle(section.accent.opacity(0.28))
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .background(
            LinearGradient(
                colors: [
                    Color.white.opacity(0.98),
                    section.accent.opacity(0.08),
                    EastwoodTheme.ivory.opacity(0.96),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 20, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(section.accent.opacity(0.12), lineWidth: 1)
        )
        .shadow(color: section.accent.opacity(0.08), radius: 12, y: 6)
    }

    private var homePreviewSections: [HomePreviewSection] {
        [
            HomePreviewSection(
                id: .collections,
                title: language.text("nav.collections"),
                subtitle: language.language == .chinese ? "最新藏品预览，快速进入展示目录。" : "Freshly curated objects to explore in the display gallery.",
                accent: EastwoodTheme.mistBlue.opacity(0.95),
                icon: "square.grid.2x2",
                items: Array(vm.artworks.filter { $0.listingType == "collection" }.prefix(3))
            ),
            HomePreviewSection(
                id: .shop,
                title: language.text("nav.shop"),
                subtitle: language.language == .chinese ? "在售古董与精品，像拍卖目录一样浏览。" : "For-sale pieces presented with a refined catalog rhythm.",
                accent: EastwoodTheme.gold,
                icon: "bag",
                items: Array(vm.artworks.filter { $0.listingType == "product" || $0.isForSale == true }.prefix(3))
            ),
            HomePreviewSection(
                id: .cases,
                title: language.text("nav.cases"),
                subtitle: language.language == .chinese ? "真实成交案例，带成交信息与渠道脉络。" : "Return cases with sale notes, channels, and collector context.",
                accent: EastwoodTheme.sage.opacity(0.95),
                icon: "arrow.triangle.2.circlepath",
                items: Array(vm.artworks.filter { $0.caseRecord != nil }.prefix(3))
            ),
        ]
        .filter { !$0.items.isEmpty }
    }

    private var previewModePicker: some View {
        HStack(spacing: 4) {
            homeModeButton(.cards, title: language.language == .chinese ? "卡片" : "Cards", systemImage: "square.grid.2x2")
            homeModeButton(.list, title: language.language == .chinese ? "列表" : "List", systemImage: "list.bullet")
        }
        .padding(4)
        .background(EastwoodTheme.ivory.opacity(0.94), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 1)
        )
    }

    private func homeModeButton(_ mode: HomePreviewMode, title: String, systemImage: String) -> some View {
        Button {
            homePreviewMode = mode
        } label: {
            HStack(spacing: 6) {
                Image(systemName: systemImage)
                    .font(.caption.weight(.semibold))
                Text(title)
            }
            .font(.footnote.weight(.semibold))
            .foregroundStyle(homePreviewMode == mode ? EastwoodTheme.gold : EastwoodTheme.mutedText)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(homePreviewMode == mode ? Color.white.opacity(0.95) : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }

    private func pill(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(EastwoodTheme.panelSoft, in: Capsule())
            .overlay(Capsule().stroke(EastwoodTheme.hairline, lineWidth: 1))
    }

    private func featuredMetric(title: String, value: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(accent)
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(EastwoodTheme.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 9)
        .background(Color.white.opacity(0.86), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(accent.opacity(0.12), lineWidth: 1)
        )
    }

    private func sectionAccent(_ kind: MainTab) -> Color {
        switch kind {
        case .collections:
            return EastwoodTheme.mistBlue.opacity(0.95)
        case .shop:
            return EastwoodTheme.gold
        case .cases:
            return EastwoodTheme.sage.opacity(0.95)
        case .home, .more:
            return EastwoodTheme.gold
        }
    }

    private var homeStats: some View {
        HStack(spacing: 10) {
            statCard(title: language.text("home.artworks"), value: "\(vm.artworks.count)", icon: "square.grid.2x2")
            statCard(title: language.text("home.shop"), value: "\(vm.artworks.filter { $0.listingType == "product" || $0.isForSale == true }.count)", icon: "bag")
            statCard(title: language.text("home.cases"), value: "\(vm.artworks.filter { $0.caseRecord != nil }.count)", icon: "arrow.triangle.2.circlepath")
        }
    }

    private func tabTitle(for tab: MainTab) -> String {
        switch tab {
        case .home: return language.text("nav.eastwood")
        case .collections: return language.text("nav.collections")
        case .shop: return language.text("nav.shop")
        case .cases: return language.text("nav.cases")
        case .more: return language.text("nav.more")
        }
    }

    private func statCard(title: String, value: String, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(EastwoodTheme.gold)
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(EastwoodTheme.ink)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .eastwoodPanel()
    }

}

struct NativeProfileRootView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var favorites: FavoritesManager
    let artworks: [NativeArtwork]

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(language.text("profile.title"))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("profile.subtitle"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text(language.text("profile.account"))
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(EastwoodTheme.ink)
                    if auth.isAuthenticated {
                        Text(auth.userEmail.isEmpty ? language.text("profile.loggedIn") : auth.userEmail)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Button(language.text("profile.signOut")) { auth.signOut() }
                            .buttonStyle(EastwoodSecondaryButtonStyle())
                    } else {
                        NativeLoginView()
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text(language.text("profile.cloudData"))
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(EastwoodTheme.ink)
                    profileNav(language.text("profile.mySaved"), "heart.fill", subtitle: language.text("profile.mySaved.subtitle")) {
                        SavedCloudView(artworks: artworks)
                    }
                    profileNav(language.text("profile.inquiries"), "square.and.pencil", subtitle: language.text("profile.inquiries.subtitle")) {
                        NativeInquiryFormView()
                    }
                    profileNav(language.text("profile.inbox"), "bubble.left.and.bubble.right.fill", subtitle: language.text("profile.inbox.subtitle")) {
                        NativeInboxView()
                    }
                }

                if auth.isAdmin {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(language.text("profile.admin"))
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundStyle(EastwoodTheme.ink)
                        profileNav(language.text("profile.adminArtworks"), "shippingbox.fill", subtitle: language.text("profile.adminArtworks.subtitle")) { NativeAdminArtworksView() }
                        profileNav(language.text("profile.adminInquiries"), "tray.full.fill", subtitle: language.text("profile.adminInquiries.subtitle")) { NativeAdminInquiriesView() }
                        profileNav(language.text("profile.adminUsers"), "person.3.fill", subtitle: language.text("profile.adminUsers.subtitle")) { NativeAdminUsersView() }
                    }
                }
            }
            .padding(.horizontal, pad)
            .padding(.vertical, 12)
        }
        .eastwoodScreen()
        .navigationTitle(language.text("profile.title"))
        .navigationBarTitleDisplayMode(.inline)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .eastwoodEnterMotion(id: "profile-tab")
    }

    private func profileNav<Destination: View>(_ title: String, _ icon: String, subtitle: String, @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(EastwoodTheme.panelSoft)
                    .frame(width: 52, height: 52)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 20, weight: .medium))
                            .foregroundStyle(EastwoodTheme.gold)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .eastwoodPanel()
    }
}

struct SavedCloudView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var favorites: FavoritesManager
    let artworks: [NativeArtwork]

    var body: some View {
        let saved = artworks.filter { favorites.favoriteIDs.contains($0.id) }

        Group {
            if !auth.isAuthenticated {
                EastwoodStateView(
                    systemImage: "person.crop.circle.badge.exclamationmark",
                    title: language.text("saved.signInRequired"),
                    message: language.text("saved.signInRequired.message")
                )
            } else if saved.isEmpty {
                EastwoodStateView(
                    systemImage: "heart.slash",
                    title: language.text("saved.empty"),
                    message: language.text("saved.empty.message")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(saved) { artwork in
                            NavigationLink(value: artwork) { NativeArtworkListRow(artwork: artwork) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(12)
                }
                .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
            }
        }
        .navigationTitle(language.text("profile.mySaved"))
        .navigationBarTitleDisplayMode(.inline)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .eastwoodScreen()
    }
}

struct NativeLoginView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 14) {
            TextField(language.text("common.email"), text: $email)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .eastwoodInput()

            SecureField(language.text("common.password"), text: $password)
                .eastwoodInput()

            if let error = auth.errorMessage {
                Text(error).font(.footnote).foregroundStyle(.red)
            }

            Button {
                Task { await auth.signIn(email: email, password: password) }
            } label: {
                if auth.isLoading {
                    ProgressView()
                        .tint(.black.opacity(0.75))
                } else {
                    Text(language.text("login.signIn"))
                }
            }
            .buttonStyle(EastwoodPrimaryButtonStyle())
            .disabled(email.isEmpty || password.isEmpty || auth.isLoading)
        }
        .padding(10)
        .eastwoodPanel()
        .padding(.top, 6)
    }
}

#Preview {
    ContentView()
}
