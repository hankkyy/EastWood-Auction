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
            NavigationStack { NativeSectionView(kind: .collections, artworks: vm.artworks) }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        case .shop:
            NavigationStack { NativeSectionView(kind: .shop, artworks: vm.artworks) }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        case .cases:
            NavigationStack { NativeSectionView(kind: .cases, artworks: vm.artworks) }
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
            VStack(alignment: .leading, spacing: 14) {
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
                    EastwoodSkeletonList(count: 4)
                        .padding(.horizontal, pagePad)
                } else {
                    Text(language.text("home.latestHighlights"))
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .padding(.horizontal, pagePad)

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
            .padding(.vertical, 12)
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
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text(language.text("home.featured"))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text("Eastwood Auction")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("home.hero.subtitle"))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Spacer()
                Circle()
                    .fill(EastwoodTheme.panelSoft)
                    .frame(width: 50, height: 50)
                    .overlay(
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(EastwoodTheme.gold)
                    )
            }

            HStack(spacing: 8) {
                pill(language.text("home.pill.curated"))
                pill(language.text("home.pill.cloud"))
                pill(language.text("home.pill.native"))
            }
        }
        .padding(16)
        .eastwoodPanel()
    }

    private func pill(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(EastwoodTheme.panelSoft, in: Capsule())
            .overlay(Capsule().stroke(EastwoodTheme.hairline, lineWidth: 1))
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
