import SwiftUI

struct NativeSettingsView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 14) {
                // About section
                VStack(alignment: .leading, spacing: 12) {
                    Text(language.text("settings.about"))
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("settings.aboutText"))
                        .font(.subheadline).foregroundStyle(.secondary).lineSpacing(4)
                }
                .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                .eastwoodPanel()

                // Version
                VStack(spacing: 0) {
                    settingRow(icon: "info.circle", title: language.text("settings.version"), value: "1.0.0", accent: EastwoodTheme.gold)
                    Divider().padding(.leading, 52)
                    settingRow(icon: "envelope", title: language.text("settings.contact"), value: "contact@eastwoodauction.com", accent: EastwoodTheme.collectionsAccent)
                    Divider().padding(.leading, 52)
                    settingRow(icon: "hand.raised", title: language.text("settings.privacy"), value: "", accent: EastwoodTheme.shopAccent, isLink: true)
                    Divider().padding(.leading, 52)
                    settingRow(icon: "doc.text", title: language.text("settings.terms"), value: "", accent: EastwoodTheme.casesAccent, isLink: true)
                }
                .eastwoodPanel()

                // Language
                VStack(alignment: .leading, spacing: 10) {
                    Text(language.text("more.language"))
                        .font(.subheadline.weight(.semibold)).foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("more.language.subtitle"))
                        .font(.caption).foregroundStyle(.secondary)
                    Picker(language.text("more.language"), selection: $language.language) {
                        Text(language.text("language.english")).tag(AppLanguage.english)
                        Text(language.text("language.chinese")).tag(AppLanguage.chinese)
                    }
                    .pickerStyle(.segmented)
                }
                .padding(14).eastwoodPanel()

                // Account
                if auth.isAuthenticated {
                    VStack(spacing: 0) {
                        settingRow(icon: "person.fill", title: auth.userEmail.isEmpty ? language.text("profile.loggedIn") : auth.userEmail, value: auth.isAdmin ? (language.language == .chinese ? "管理员" : "Admin") : (language.language == .chinese ? "用户" : "User"), accent: EastwoodTheme.gold)
                    }
                    .eastwoodPanel()

                    Button(language.text("profile.signOut")) { auth.signOut() }
                        .buttonStyle(EastwoodSecondaryButtonStyle())
                }
            }
            .padding(.horizontal, pad).padding(.vertical, 12)
        }
        .eastwoodScreen()
        .navigationTitle(language.text("settings.title"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private func settingRow(icon: String, title: String, value: String, accent: Color, isLink: Bool = false) -> some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(accent.opacity(0.10)).frame(width: 36, height: 36)
                .overlay(Image(systemName: icon).font(.subheadline.weight(.medium)).foregroundStyle(accent))
            Text(title).font(.subheadline).foregroundStyle(EastwoodTheme.ink)
            Spacer()
            if !value.isEmpty {
                Text(value).font(.caption).foregroundStyle(.secondary)
            }
            if isLink {
                Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
    }
}
