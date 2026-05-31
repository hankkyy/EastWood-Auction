import SwiftUI
import UIKit

struct ContentView: View {
    private enum MainTab: Hashable {
        case home, collections, shop, cases, image, more, profile
    }

    @StateObject private var vm = NativeHomeViewModel()
    @StateObject private var auth = AuthManager()
    @StateObject private var favorites = FavoritesManager()
    @State private var showSessionExpiredAlert = false
    @State private var selectedTab: MainTab = .home

    var body: some View {
        TabView(selection: $selectedTab) {
            homeTab
                .modifier(EastwoodTabMotion(isActive: selectedTab == .home))
                .tag(MainTab.home)
                .tabItem { Label("Home", systemImage: "house.fill") }

            NavigationStack { NativeSectionView(kind: .collections, artworks: vm.artworks) }
                .modifier(EastwoodTabMotion(isActive: selectedTab == .collections))
                .tag(MainTab.collections)
                .tabItem { Label("Collections", systemImage: "square.grid.2x2.fill") }

            NavigationStack { NativeSectionView(kind: .shop, artworks: vm.artworks) }
                .modifier(EastwoodTabMotion(isActive: selectedTab == .shop))
                .tag(MainTab.shop)
                .tabItem { Label("Shop", systemImage: "bag.fill") }

            NavigationStack { NativeSectionView(kind: .cases, artworks: vm.artworks) }
                .modifier(EastwoodTabMotion(isActive: selectedTab == .cases))
                .tag(MainTab.cases)
                .tabItem { Label("Cases", systemImage: "arrow.triangle.2.circlepath") }

            NativeImageSearchView()
                .modifier(EastwoodTabMotion(isActive: selectedTab == .image))
                .tag(MainTab.image)
                .tabItem { Label("Image", systemImage: "camera.viewfinder") }

            NativeMoreView(artworks: vm.artworks)
                .modifier(EastwoodTabMotion(isActive: selectedTab == .more))
                .tag(MainTab.more)
                .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }

            profileTab
                .modifier(EastwoodTabMotion(isActive: selectedTab == .profile))
                .tag(MainTab.profile)
                .tabItem { Label("Profile", systemImage: "person.fill") }
        }
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
        .alert("Session expired", isPresented: $showSessionExpiredAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Please sign in again.")
        }
    }

    private var homeTab: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.artworks.isEmpty {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            homeHero
                                .padding(.horizontal, 12)
                            EastwoodSkeletonList(count: 4)
                                .padding(.horizontal, 12)
                        }
                        .padding(.vertical, 12)
                    }
                } else if let error = vm.errorMessage, vm.artworks.isEmpty {
                    EastwoodStateView(
                        systemImage: "wifi.exclamationmark",
                        title: "Unable to Load",
                        message: error,
                        buttonTitle: "Retry",
                        onTap: { Task { await vm.load() } }
                    )
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            homeHero
                                .padding(.horizontal, 12)

                            LazyVStack(spacing: 12) {
                                ForEach(vm.artworks.prefix(8)) { artwork in
                                    NavigationLink(value: artwork) {
                                        NativeArtworkCard(artwork: artwork)
                                    }
                                    .buttonStyle(.plain)
                                    .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                                }
                            }
                            .padding(.horizontal, 12)
                        }
                        .padding(.vertical, 12)
                    }
                    .animation(EastwoodMotion.listUpdate, value: vm.artworks.count)
                    .refreshable { await vm.load() }
                }
            }
            .navigationTitle("Eastwood")
            .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        NativeSearchView(artworks: vm.artworks)
                    } label: {
                        Image(systemName: "magnifyingglass")
                    }
                }
            }
            .background(Color.black.ignoresSafeArea())
            .background(EastwoodBackground())
            .eastwoodEnterMotion(id: "home-tab")
        }
    }

    private var homeHero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Eastwood Auction")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(EastwoodTheme.goldSoft)
            Text("Curated Chinese antiques, premium collector experience, and cloud-synced workflows.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack(spacing: 8) {
                pill("Curated")
                pill("Cloud Sync")
                pill("Native iOS")
            }
        }
        .padding(16)
        .eastwoodPanel()
    }

    private func pill(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(EastwoodTheme.panelSoft.opacity(0.9), in: Capsule())
            .overlay(Capsule().stroke(EastwoodTheme.gold.opacity(0.28), lineWidth: 1))
    }

    private var profileTab: some View {
        NavigationStack {
            List {
                Section("Account") {
                    if auth.isAuthenticated {
                        Text(auth.userEmail.isEmpty ? "Logged in" : auth.userEmail)
                        Button("Sign out") { auth.signOut() }
                    } else {
                        NativeLoginView()
                            .listRowBackground(Color.clear)
                    }
                }

                Section("Cloud Data") {
                    NavigationLink("My Saved") {
                        SavedCloudView(artworks: vm.artworks)
                    }
                    NavigationLink("Inquiries") {
                        NativeInquiryFormView()
                    }
                    NavigationLink("Inbox") {
                        NativeInboxView()
                    }
                    if auth.isAdmin {
                        NavigationLink("Admin Artworks") {
                            NativeAdminArtworksView()
                        }
                        NavigationLink("Admin Inquiries") {
                            NativeAdminInquiriesView()
                        }
                        NavigationLink("Admin Users") {
                            NativeAdminUsersView()
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(EastwoodBackground())
            .navigationTitle("Profile")
            .eastwoodEnterMotion(id: "profile-tab")
        }
    }
}

struct SavedCloudView: View {
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var favorites: FavoritesManager
    let artworks: [NativeArtwork]

    var body: some View {
        let saved = artworks.filter { favorites.favoriteIDs.contains($0.id) }

        Group {
            if !auth.isAuthenticated {
                EastwoodStateView(
                    systemImage: "person.crop.circle.badge.exclamationmark",
                    title: "Sign In Required",
                    message: "Please sign in to view cloud favorites."
                )
            } else if saved.isEmpty {
                EastwoodStateView(
                    systemImage: "heart.slash",
                    title: "No Favorites Yet",
                    message: "Save artworks to build your personal shortlist."
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(saved) { artwork in
                            NavigationLink(value: artwork) { NativeArtworkCard(artwork: artwork) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(12)
                }
                .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
            }
        }
        .navigationTitle("My Saved")
        .background(EastwoodBackground())
    }
}

struct NativeLoginView: View {
    @EnvironmentObject private var auth: AuthManager
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 14) {
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .eastwoodInput()

            SecureField("Password", text: $password)
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
                    Text("Sign in")
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

private struct EastwoodTabMotion: ViewModifier {
    let isActive: Bool

    func body(content: Content) -> some View {
        content
            .opacity(isActive ? 1 : 0.985)
            .scaleEffect(isActive ? 1 : 0.995)
            .animation(EastwoodMotion.tabSwitch, value: isActive)
    }
}

#Preview {
    ContentView()
}
