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
                pageHeader(
                    title: language.text("content.exhibitions.title"),
                    subtitle: language.text("content.exhibitions.subtitle")
                )

                sectionTitle(language.text("content.exhibitions.special"))
                infoCard(language.text("content.exhibitions.onSite.title"), language.text("content.exhibitions.onSite.desc"))
                infoCard(language.text("content.exhibitions.online.title"), language.text("content.exhibitions.online.desc"))

                sectionTitle(language.text("content.exhibitions.featuredWorks"))
                LazyVStack(spacing: 10) {
                    ForEach(highlighted) { artwork in
                        NavigationLink(value: artwork) {
                            NativeArtworkListRow(artwork: artwork)
                        }
                        .buttonStyle(.plain)
                    }
                }

                sectionTitle(language.text("content.exhibitions.browseMore"))
                infoCard(language.text("content.exhibitions.eventFeed.title"), language.text("content.exhibitions.eventFeed.desc"))
                infoCard(language.text("content.exhibitions.collectorSupport.title"), language.text("content.exhibitions.collectorSupport.desc"))

                sectionTitle(language.text("content.quickActions"))
                NavigationLink(language.text("content.openShop")) {
                    NativeSectionView(kind: .shop, artworks: artworks)
                }
                .buttonStyle(EastwoodSecondaryButtonStyle())
                NavigationLink(language.text("content.openCollections")) {
                    NativeSectionView(kind: .collections, artworks: artworks)
                }
                .buttonStyle(EastwoodSecondaryButtonStyle())
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle(language.text("content.exhibitions.title"))
        .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
        .background(EastwoodBackground())
    }
}

struct NativeVisitView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHeader(
                    title: language.text("content.visit.title"),
                    subtitle: language.text("content.visit.subtitle")
                )

                sectionTitle(language.text("content.visit.before"))
                infoCard(language.text("content.visit.appointment.title"), language.text("content.visit.appointment.desc"))
                infoCard(language.text("content.visit.preparation.title"), language.text("content.visit.preparation.desc"))
                infoCard(language.text("content.visit.imageSearch.title"), language.text("content.visit.imageSearch.desc"))

                sectionTitle(language.text("content.visit.onSite"))
                infoCard(language.text("content.visit.consultation.title"), language.text("content.visit.consultation.desc"))
                infoCard(language.text("content.visit.consignment.title"), language.text("content.visit.consignment.desc"))
                infoCard(language.text("content.visit.policy.title"), language.text("content.visit.policy.desc"))

                sectionTitle(language.text("content.quickActions"))
                NavigationLink(language.text("content.openInquiries")) { NativeInquiryFormView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                NavigationLink(language.text("content.openImageSearch")) { NativeImageSearchView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle(language.text("content.visit.title"))
        .background(EastwoodBackground())
    }
}

struct NativeSupportView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHeader(
                    title: language.text("content.support.title"),
                    subtitle: language.text("content.support.subtitle")
                )

                sectionTitle(language.text("content.support.serviceAreas"))
                infoCard(language.text("content.support.collector.title"), language.text("content.support.collector.desc"))
                infoCard(language.text("content.support.consign.title"), language.text("content.support.consign.desc"))
                infoCard(language.text("content.support.shop.title"), language.text("content.support.shop.desc"))

                sectionTitle(language.text("content.support.workflow"))
                infoCard(language.text("content.support.statusSync.title"), language.text("content.support.statusSync.desc"))
                infoCard(language.text("content.support.inboxTracking.title"), language.text("content.support.inboxTracking.desc"))

                sectionTitle(language.text("content.quickActions"))
                NavigationLink(language.text("content.openInbox")) { NativeInboxView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                NavigationLink(language.text("content.submitInquiry")) { NativeInquiryFormView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle(language.text("content.support.title"))
        .background(EastwoodBackground())
    }
}

struct NativeDonationView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHeader(
                    title: language.text("content.donation.title"),
                    subtitle: language.text("content.donation.subtitle")
                )

                sectionTitle(language.text("content.donation.path"))
                infoCard(language.text("content.donation.cataloging.title"), language.text("content.donation.cataloging.desc"))
                infoCard(language.text("content.donation.appraisal.title"), language.text("content.donation.appraisal.desc"))

                sectionTitle(language.text("content.donation.prepare"))
                infoCard(language.text("content.donation.itemInfo.title"), language.text("content.donation.itemInfo.desc"))
                infoCard(language.text("content.donation.communication.title"), language.text("content.donation.communication.desc"))

                sectionTitle(language.text("content.quickActions"))
                NavigationLink(language.text("content.startConsignment")) { NativeInquiryFormView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                NavigationLink(language.text("content.openCases")) { NativeSectionView(kind: .cases, artworks: artworks) }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle(language.text("content.donation.title"))
        .background(EastwoodBackground())
    }
}

private func pageHeader(title: String, subtitle: String) -> some View {
    VStack(alignment: .leading, spacing: 5) {
        Text(title)
            .font(.system(size: 30, weight: .bold, design: .rounded))
        Text(subtitle)
            .font(.subheadline)
            .foregroundStyle(.secondary)
    }
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
    .padding(10)
    .eastwoodPanel()
}
