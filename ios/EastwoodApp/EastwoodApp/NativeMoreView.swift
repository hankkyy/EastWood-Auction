import SwiftUI

struct NativeMoreView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    private var shopCount: Int {
        artworks.filter { $0.listingType == "product" }.count
    }

    private var caseCount: Int {
        artworks.filter { $0.caseRecord != nil }.count
    }

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    header

                    HStack(spacing: 12) {
                        statCard(title: language.text("home.artworks"), value: "\(artworks.count)", icon: "square.grid.2x2")
                        statCard(title: language.text("home.shop"), value: "\(shopCount)", icon: "bag")
                        statCard(title: language.text("home.cases"), value: "\(caseCount)", icon: "arrow.triangle.2.circlepath")
                    }

                    moduleSection(title: language.text("more.mainTools")) {
                        navRow(language.text("more.imageSearch"), "camera.viewfinder", subtitle: language.text("more.imageSearch.subtitle")) { NativeImageSearchView() }
                        navRow(language.text("more.profile"), "person.fill", subtitle: language.text("more.profile.subtitle")) { NativeProfileRootView(artworks: artworks) }
                    }

                    moduleSection(title: language.text("more.preferences")) {
                        languagePicker
                    }

                    moduleSection(title: language.text("more.contentModules")) {
                        navRow(language.text("more.exhibitions"), "sparkles", subtitle: language.text("more.exhibitions.subtitle")) { NativeExhibitionsView(artworks: artworks) }
                        navRow(language.text("more.visit"), "map", subtitle: language.text("more.visit.subtitle")) { NativeVisitView(artworks: artworks) }
                        navRow(language.text("more.support"), "lifepreserver", subtitle: language.text("more.support.subtitle")) { NativeSupportView(artworks: artworks) }
                        navRow(language.text("more.donation"), "hands.sparkles", subtitle: language.text("more.donation.subtitle")) { NativeDonationView(artworks: artworks) }
                    }
                }
                .padding(.horizontal, pad)
                .padding(.vertical, 12)
            }
            .eastwoodScreen()
            .navigationTitle(language.text("more.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .eastwoodEnterMotion(id: "more-page")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(language.text("more.title"))
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(EastwoodTheme.ink)
            Text(language.text("more.subtitle"))
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var languagePicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(language.text("more.language"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(EastwoodTheme.ink)
            Text(language.text("more.language.subtitle"))
                .font(.caption)
                .foregroundStyle(.secondary)

            Picker(language.text("more.language"), selection: $language.language) {
                Text(language.text("language.english")).tag(AppLanguage.english)
                Text(language.text("language.chinese")).tag(AppLanguage.chinese)
            }
            .pickerStyle(.segmented)
        }
        .padding(14)
        .eastwoodPanel()
    }

    private func statCard(title: String, value: String, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(EastwoodTheme.gold)
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(EastwoodTheme.ink)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .eastwoodPanel()
    }

    private func moduleSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(EastwoodTheme.ink)
            content()
        }
    }

    private func navRow<Destination: View>(_ title: String, _ systemImage: String, subtitle: String, @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(EastwoodTheme.panelSoft)
                    .frame(width: 48, height: 48)
                    .overlay(
                        Image(systemName: systemImage)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(EastwoodTheme.gold)
                    )

                VStack(alignment: .leading, spacing: 4) {
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
