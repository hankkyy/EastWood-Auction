import SwiftUI

struct NativeMoreView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    private var shopCount: Int { artworks.filter { $0.listingType == "product" }.count }
    private var caseCount: Int { artworks.filter { $0.caseRecord != nil }.count }

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Header
                    VStack(alignment: .leading, spacing: 6) {
                        Text(language.text("more.title"))
                            .font(.system(size: 28, weight: .bold, design: .serif))
                            .foregroundStyle(EastwoodTheme.ink)
                        Text(language.text("more.subtitle"))
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Stats
                    HStack(spacing: 10) {
                        statCard(title: language.text("home.artworks"), value: "\(artworks.count)",
                                 icon: "square.grid.2x2", accent: EastwoodTheme.collectionsAccent)
                        statCard(title: language.text("home.shop"), value: "\(shopCount)",
                                 icon: "bag", accent: EastwoodTheme.shopAccent)
                        statCard(title: language.text("home.cases"), value: "\(caseCount)",
                                 icon: "arrow.triangle.2.circlepath", accent: EastwoodTheme.casesAccent)
                    }

                    // Quick tools
                    sectionHeader(title: language.text("more.mainTools"))
                    VStack(spacing: 8) {
                        quickNav(language.text("more.imageSearch"), "camera.viewfinder",
                                 subtitle: language.text("more.imageSearch.subtitle")) {
                            NativeImageSearchView()
                        }
                        quickNav(language.text("more.profile"), "person.fill",
                                 subtitle: language.text("more.profile.subtitle")) {
                            NativeProfileRootView(artworks: artworks)
                        }
                    }

                    // Explore
                    sectionHeader(title: language.text("more.contentModules"))
                    VStack(spacing: 8) {
                        // 拍卖隐藏 — 暂未上线
                        // exploreNav(language.text("more.exhibitions"), "sparkles",
                        //            subtitle: language.text("more.exhibitions.subtitle"),
                        //            accent: EastwoodTheme.gold) {
                        //     NativeExhibitionsView(artworks: artworks)
                        // }
                        exploreNav(language.text("more.visit"), "map",
                                   subtitle: language.text("more.visit.subtitle"),
                                   accent: EastwoodTheme.collectionsAccent) {
                            NativeVisitView(artworks: artworks)
                        }
                        exploreNav(language.text("more.support"), "lifepreserver",
                                   subtitle: language.text("more.support.subtitle"),
                                   accent: EastwoodTheme.shopAccent) {
                            NativeSupportView(artworks: artworks)
                        }
                        exploreNav(language.text("more.donation"), "hands.sparkles",
                                   subtitle: language.text("more.donation.subtitle"),
                                   accent: EastwoodTheme.casesAccent) {
                            NativeDonationView(artworks: artworks)
                        }
                    }

                    // Language picker
                    sectionHeader(title: language.text("more.preferences"))
                    languagePicker
                }
                .padding(.horizontal, pad)
                .padding(.vertical, 12)
            }
            .eastwoodScreen()
            .navigationTitle(language.text("more.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
    }

    // MARK: - Components

    private func sectionHeader(title: String) -> some View {
        Text(title)
            .font(.system(size: 18, weight: .bold, design: .rounded))
            .foregroundStyle(EastwoodTheme.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 4)
    }

    private func statCard(title: String, value: String, icon: String, accent: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(accent)
                .frame(width: 34, height: 34)
                .background(accent.opacity(0.10), in: Circle())
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(EastwoodTheme.ink)
            Text(title)
                .font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .eastwoodPanel()
    }

    private func quickNav<Destination: View>(_ title: String, _ icon: String,
                                              subtitle: String,
                                              @ViewBuilder destination: () -> Destination) -> some View {
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
                    Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(EastwoodTheme.ink)
                    Text(subtitle).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            }
            .padding(14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .eastwoodPanel()
    }

    private func exploreNav<Destination: View>(_ title: String, _ icon: String,
                                                subtitle: String, accent: Color,
                                                @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(accent.opacity(0.10))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 17, weight: .medium))
                            .foregroundStyle(accent)
                    )
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(EastwoodTheme.ink)
                    Text(subtitle).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            }
            .padding(14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .eastwoodPanel()
    }

    private var languagePicker: some View {
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
        .padding(14)
        .eastwoodPanel()
    }
}
