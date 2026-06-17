import SwiftUI

struct NativeProfileRootView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @EnvironmentObject private var favorites: FavoritesManager
    let artworks: [NativeArtwork]

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 16) {
                // Header
                VStack(alignment: .leading, spacing: 6) {
                    Text(language.text("profile.title"))
                        .font(.system(size: 28, weight: .bold, design: .serif))
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("profile.subtitle"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Account
                accountSection

                // Cloud data
                VStack(alignment: .leading, spacing: 10) {
                    sectionHeader(language.text("profile.cloudData"))
                    profileNav(language.text("profile.mySaved"), "heart.fill",
                               subtitle: language.text("profile.mySaved.subtitle")) {
                        SavedCloudView(artworks: artworks)
                    }
                    profileNav(language.text("profile.inquiries"), "square.and.pencil",
                               subtitle: language.text("profile.inquiries.subtitle")) {
                        NativeInquiryFormView()
                    }
                    profileNav(language.text("profile.inbox"), "bubble.left.and.bubble.right.fill",
                               subtitle: language.text("profile.inbox.subtitle")) {
                        NativeInboxView()
                    }
                }

                // Admin
                if auth.isAdmin {
                    adminSection
                }

                // Explore more
                VStack(alignment: .leading, spacing: 10) {
                    sectionHeader(language.text("more.title"))
                    profileNav(language.text("more.contentModules"), "square.grid.2x2.fill",
                               subtitle: language.text("more.subtitle")) {
                        NativeMoreView(artworks: artworks)
                    }
                    profileNav(language.text("settings.title"), "gearshape.fill",
                               subtitle: language.language == .chinese ? "语言、关于和账户" : "Language, about, and account") {
                        NativeSettingsView()
                    }
                }
            }
            .padding(.horizontal, pad)
            .padding(.vertical, 12)
            Color.clear.frame(height: 76)  // avoid tab bar overlap
        }
        .eastwoodScreen()
        .navigationTitle(language.text("profile.title"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .navigationDestination(for: NativeArtwork.self) {
            NativeArtworkDetailView(artwork: $0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Account Section

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(language.text("profile.account"))
            if auth.isAuthenticated {
                HStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(EastwoodTheme.gold.opacity(0.10))
                        .frame(width: 48, height: 48)
                        .overlay(
                            Image(systemName: "person.fill")
                                .font(.title3)
                                .foregroundStyle(EastwoodTheme.gold)
                        )
                    VStack(alignment: .leading, spacing: 3) {
                        Text(auth.userEmail.isEmpty
                             ? language.text("profile.loggedIn")
                             : auth.userEmail)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(EastwoodTheme.ink)
                        Text(auth.isAdmin
                             ? (language.language == .chinese ? "管理员" : "Admin")
                             : (language.language == .chinese ? "用户" : "User"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button(language.text("profile.signOut")) {
                        auth.signOut()
                    }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                }
                .padding(14)
                .eastwoodPanel()
            } else {
                NativeLoginView()
            }
        }
    }

    // MARK: - Admin Section

    private var adminSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(language.text("profile.admin"))
            profileNav(language.text("profile.adminArtworks"), "shippingbox.fill",
                       subtitle: language.text("profile.adminArtworks.subtitle")) {
                NativeAdminArtworksView()
            }
            profileNav(language.text("profile.adminInquiries"), "tray.full.fill",
                       subtitle: language.text("profile.adminInquiries.subtitle")) {
                NativeAdminInquiriesView()
            }
            profileNav(language.text("profile.adminUsers"), "person.3.fill",
                       subtitle: language.text("profile.adminUsers.subtitle")) {
                NativeAdminUsersView()
            }
        }
    }

    // MARK: - Shared Components

    private func sectionHeader(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 20, weight: .bold, design: .rounded))
            .foregroundStyle(EastwoodTheme.ink)
    }

    private func profileNav<Destination: View>(
        _ title: String,
        _ icon: String,
        subtitle: String,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(EastwoodTheme.gold.opacity(0.10))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 17, weight: .medium))
                            .foregroundStyle(EastwoodTheme.gold)
                    )
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(subtitle)
                        .font(.caption)
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

// MARK: - Saved Cloud View

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
                            NavigationLink(value: artwork) {
                                NativeArtworkListRow(artwork: artwork)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(12)
                }
                .navigationDestination(for: NativeArtwork.self) {
                    NativeArtworkDetailView(artwork: $0)
                }
            }
        }
        .navigationTitle(language.text("profile.mySaved"))
        .navigationBarTitleDisplayMode(.inline)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .eastwoodScreen()
    }
}

// MARK: - Login View

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
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(EastwoodTheme.error)
            }

            Button {
                Task { await auth.signIn(email: email, password: password) }
            } label: {
                if auth.isLoading {
                    ProgressView().tint(.white)
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
