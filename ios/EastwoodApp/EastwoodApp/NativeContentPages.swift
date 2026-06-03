import SwiftUI

struct NativeExhibitionsView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    private var highlighted: [NativeArtwork] {
        Array(artworks.prefix(6))
    }

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHero(
                    title: language.text("content.exhibitions.title"),
                    subtitle: language.text("content.exhibitions.subtitle")
                )

                contentSection(language.text("content.exhibitions.special")) {
                    infoCard(language.text("content.exhibitions.onSite.title"), language.text("content.exhibitions.onSite.desc"))
                    infoCard(language.text("content.exhibitions.online.title"), language.text("content.exhibitions.online.desc"))
                }

                contentSection(language.text("content.exhibitions.featuredWorks")) {
                    LazyVStack(spacing: 10) {
                        ForEach(highlighted) { artwork in
                            NavigationLink(value: artwork) {
                                NativeArtworkListRow(artwork: artwork)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                contentSection(language.text("content.exhibitions.browseMore")) {
                    infoCard(language.text("content.exhibitions.eventFeed.title"), language.text("content.exhibitions.eventFeed.desc"))
                    infoCard(language.text("content.exhibitions.collectorSupport.title"), language.text("content.exhibitions.collectorSupport.desc"))
                }

                contentSection(language.text("content.quickActions")) {
                    actionLink(language.text("content.openShop")) { NativeSectionView(kind: .shop, artworks: artworks) }
                    actionLink(language.text("content.openCollections")) { NativeSectionView(kind: .collections, artworks: artworks) }
                }
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle(language.text("content.exhibitions.title"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
        .eastwoodScreen()
    }
}

struct NativeVisitView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHero(
                    title: language.text("content.visit.title"),
                    subtitle: language.text("content.visit.subtitle")
                )

                contentSection(language.text("content.visit.before")) {
                    infoCard(language.text("content.visit.appointment.title"), language.text("content.visit.appointment.desc"))
                    infoCard(language.text("content.visit.preparation.title"), language.text("content.visit.preparation.desc"))
                    infoCard(language.text("content.visit.imageSearch.title"), language.text("content.visit.imageSearch.desc"))
                }

                contentSection(language.text("content.visit.onSite")) {
                    infoCard(language.text("content.visit.consultation.title"), language.text("content.visit.consultation.desc"))
                    infoCard(language.text("content.visit.consignment.title"), language.text("content.visit.consignment.desc"))
                    infoCard(language.text("content.visit.policy.title"), language.text("content.visit.policy.desc"))
                }

                contentSection(language.text("content.quickActions")) {
                    actionLink(language.text("content.openInquiries")) { NativeInquiryFormView() }
                    actionLink(language.text("content.openImageSearch")) { NativeImageSearchView() }
                }
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle(language.text("content.visit.title"))
        .navigationBarTitleDisplayMode(.inline)
        .eastwoodScreen()
    }
}

struct NativeSupportView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHero(
                    title: language.text("content.support.title"),
                    subtitle: language.text("content.support.subtitle")
                )

                contentSection(language.text("content.support.serviceAreas")) {
                    infoCard(language.text("content.support.collector.title"), language.text("content.support.collector.desc"))
                    infoCard(language.text("content.support.consign.title"), language.text("content.support.consign.desc"))
                    infoCard(language.text("content.support.shop.title"), language.text("content.support.shop.desc"))
                }

                contentSection(language.text("content.support.workflow")) {
                    infoCard(language.text("content.support.statusSync.title"), language.text("content.support.statusSync.desc"))
                    infoCard(language.text("content.support.inboxTracking.title"), language.text("content.support.inboxTracking.desc"))
                }

                contentSection(language.text("content.quickActions")) {
                    actionLink(language.text("content.openInbox")) { NativeInboxView() }
                    actionLink(language.text("content.submitInquiry")) { NativeInquiryFormView() }
                }
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle(language.text("content.support.title"))
        .navigationBarTitleDisplayMode(.inline)
        .eastwoodScreen()
    }
}

struct NativeDonationView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHero(
                    title: language.text("content.donation.title"),
                    subtitle: language.text("content.donation.subtitle")
                )

                contentSection(language.text("content.donation.path")) {
                    infoCard(language.text("content.donation.cataloging.title"), language.text("content.donation.cataloging.desc"))
                    infoCard(language.text("content.donation.appraisal.title"), language.text("content.donation.appraisal.desc"))
                }

                contentSection(language.text("content.donation.prepare")) {
                    infoCard(language.text("content.donation.itemInfo.title"), language.text("content.donation.itemInfo.desc"))
                    infoCard(language.text("content.donation.communication.title"), language.text("content.donation.communication.desc"))
                }

                contentSection(language.text("content.quickActions")) {
                    actionLink(language.text("content.startConsignment")) { NativeInquiryFormView() }
                    actionLink(language.text("content.openCases")) { NativeSectionView(kind: .cases, artworks: artworks) }
                }
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle(language.text("content.donation.title"))
        .navigationBarTitleDisplayMode(.inline)
        .eastwoodScreen()
    }
}

private func pageHero(title: String, subtitle: String) -> some View {
    VStack(alignment: .leading, spacing: 10) {
        Text(title)
            .font(.system(size: 30, weight: .bold, design: .rounded))
            .foregroundStyle(EastwoodTheme.ink)
        Text(subtitle)
            .font(.subheadline)
            .foregroundStyle(.secondary)
    }
    .padding(16)
    .eastwoodPanel()
}

private func sectionTitle(_ text: String) -> some View {
    Text(text)
        .font(.headline.weight(.semibold))
        .padding(.top, 2)
}

private func infoCard(_ title: String, _ desc: String) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(title).font(.subheadline.weight(.semibold))
        Text(desc).font(.subheadline).foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(12)
    .eastwoodPanel()
}

private func contentSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 10) {
        sectionTitle(title)
        content()
    }
}

private func actionLink<Destination: View>(_ title: String, @ViewBuilder destination: () -> Destination) -> some View {
    NavigationLink(destination: destination()) {
        HStack {
            Text(title)
            Spacer()
            Image(systemName: "arrow.right")
        }
    }
    .buttonStyle(EastwoodSecondaryButtonStyle())
}
