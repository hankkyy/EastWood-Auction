import SwiftUI

// MARK: - Shared Components

private struct ContentPageHero: View {
    let title: String
    let subtitle: String
    let icon: String
    let accent: Color

    var body: some View {
        HStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(accent.opacity(0.12))
                .frame(width: 56, height: 56)
                .overlay(
                    Image(systemName: icon)
                        .font(.title2.weight(.medium))
                        .foregroundStyle(accent)
                )
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 24, weight: .bold, design: .serif))
                    .foregroundStyle(EastwoodTheme.ink)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .eastwoodPanel()
    }
}

private struct ContentInfoCard: View {
    let icon: String
    let title: String
    let description: String
    let accent: Color

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(accent.opacity(0.10))
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: icon)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(accent)
                )
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EastwoodTheme.ink)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineSpacing(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .eastwoodPanel()
    }
}

private struct ContentActionLink<Destination: View>: View {
    let title: String
    let accent: Color
    @ViewBuilder let destination: () -> Destination

    var body: some View {
        NavigationLink(destination: destination()) {
            HStack {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Image(systemName: "arrow.right")
                    .font(.caption.weight(.bold))
            }
            .foregroundStyle(accent)
            .padding(.horizontal, 18)
            .padding(.vertical, 13)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(accent.opacity(0.06))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(accent.opacity(0.12), lineWidth: 1)
            )
        }
    }
}

private struct ContentSectionHeader: View {
    let title: String
    var body: some View {
        Text(title)
            .font(.system(size: 18, weight: .bold, design: .rounded))
            .foregroundStyle(EastwoodTheme.ink)
    }
}

// MARK: - Exhibitions / Auctions

struct NativeExhibitionsView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]
    private let accent = EastwoodTheme.gold

    private var highlighted: [NativeArtwork] {
        Array(artworks.prefix(6))
    }

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 14) {
                ContentPageHero(
                    title: language.text("content.exhibitions.title"),
                    subtitle: language.text("content.exhibitions.subtitle"),
                    icon: "sparkles", accent: accent
                )

                VStack(alignment: .leading, spacing: 10) {
                    ContentSectionHeader(title: language.text("content.exhibitions.special"))
                    ContentInfoCard(icon: "building.columns.fill",
                                    title: language.text("content.exhibitions.onSite.title"),
                                    description: language.text("content.exhibitions.onSite.desc"),
                                    accent: accent)
                    ContentInfoCard(icon: "globe",
                                    title: language.text("content.exhibitions.online.title"),
                                    description: language.text("content.exhibitions.online.desc"),
                                    accent: EastwoodTheme.collectionsAccent)
                }

                if !highlighted.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        ContentSectionHeader(title: language.text("content.exhibitions.featuredWorks"))
                        ForEach(highlighted) { artwork in
                            NavigationLink(value: artwork) {
                                NativeArtworkListRow(artwork: artwork)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    ContentSectionHeader(title: language.text("content.exhibitions.browseMore"))
                    ContentInfoCard(icon: "rectangle.stack.fill",
                                    title: language.text("content.exhibitions.eventFeed.title"),
                                    description: language.text("content.exhibitions.eventFeed.desc"),
                                    accent: EastwoodTheme.casesAccent)
                    ContentInfoCard(icon: "person.2.fill",
                                    title: language.text("content.exhibitions.collectorSupport.title"),
                                    description: language.text("content.exhibitions.collectorSupport.desc"),
                                    accent: EastwoodTheme.collectionsAccent)
                }

                VStack(alignment: .leading, spacing: 8) {
                    ContentSectionHeader(title: language.text("content.quickActions"))
                    ContentActionLink(title: language.text("content.openShop"), accent: EastwoodTheme.shopAccent) {
                        NativeSectionView(kind: .shop, artworks: artworks)
                    }
                    ContentActionLink(title: language.text("content.openCollections"), accent: EastwoodTheme.collectionsAccent) {
                        NativeSectionView(kind: .collections, artworks: artworks)
                    }
                }
            }
            .padding(pad)
        }
        .navigationTitle(language.text("content.exhibitions.title"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
        .eastwoodScreen()
    }
}

// MARK: - Visit / Browse

struct NativeVisitView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]
    private let accent = EastwoodTheme.collectionsAccent

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 14) {
                ContentPageHero(
                    title: language.text("content.visit.title"),
                    subtitle: language.text("content.visit.subtitle"),
                    icon: "map", accent: accent
                )

                VStack(alignment: .leading, spacing: 10) {
                    ContentSectionHeader(title: language.text("content.visit.before"))
                    ContentInfoCard(icon: "calendar",
                                    title: language.text("content.visit.appointment.title"),
                                    description: language.text("content.visit.appointment.desc"),
                                    accent: accent)
                    ContentInfoCard(icon: "doc.text.fill",
                                    title: language.text("content.visit.preparation.title"),
                                    description: language.text("content.visit.preparation.desc"),
                                    accent: EastwoodTheme.gold)
                    ContentInfoCard(icon: "camera.viewfinder",
                                    title: language.text("content.visit.imageSearch.title"),
                                    description: language.text("content.visit.imageSearch.desc"),
                                    accent: EastwoodTheme.shopAccent)
                }

                VStack(alignment: .leading, spacing: 10) {
                    ContentSectionHeader(title: language.text("content.visit.onSite"))
                    ContentInfoCard(icon: "person.fill.questionmark",
                                    title: language.text("content.visit.consultation.title"),
                                    description: language.text("content.visit.consultation.desc"),
                                    accent: accent)
                    ContentInfoCard(icon: "tag.fill",
                                    title: language.text("content.visit.consignment.title"),
                                    description: language.text("content.visit.consignment.desc"),
                                    accent: EastwoodTheme.gold)
                    ContentInfoCard(icon: "doc.plaintext.fill",
                                    title: language.text("content.visit.policy.title"),
                                    description: language.text("content.visit.policy.desc"),
                                    accent: EastwoodTheme.casesAccent)
                }

                VStack(alignment: .leading, spacing: 8) {
                    ContentSectionHeader(title: language.text("content.quickActions"))
                    ContentActionLink(title: language.text("content.openInquiries"), accent: EastwoodTheme.gold) {
                        NativeInquiryFormView()
                    }
                    ContentActionLink(title: language.text("content.openImageSearch"), accent: EastwoodTheme.shopAccent) {
                        NativeImageSearchView()
                    }
                }
            }
            .padding(pad)
        }
        .navigationTitle(language.text("content.visit.title"))
        .navigationBarTitleDisplayMode(.inline)
        .eastwoodScreen()
    }
}

// MARK: - Services / Support

struct NativeSupportView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]
    private let accent = EastwoodTheme.shopAccent

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 14) {
                ContentPageHero(
                    title: language.text("content.support.title"),
                    subtitle: language.text("content.support.subtitle"),
                    icon: "lifepreserver", accent: accent
                )

                VStack(alignment: .leading, spacing: 10) {
                    ContentSectionHeader(title: language.text("content.support.serviceAreas"))
                    ContentInfoCard(icon: "person.fill.checkmark",
                                    title: language.text("content.support.collector.title"),
                                    description: language.text("content.support.collector.desc"),
                                    accent: EastwoodTheme.gold)
                    ContentInfoCard(icon: "shippingbox.fill",
                                    title: language.text("content.support.consign.title"),
                                    description: language.text("content.support.consign.desc"),
                                    accent: EastwoodTheme.casesAccent)
                    ContentInfoCard(icon: "bag.fill",
                                    title: language.text("content.support.shop.title"),
                                    description: language.text("content.support.shop.desc"),
                                    accent: accent)
                }

                VStack(alignment: .leading, spacing: 10) {
                    ContentSectionHeader(title: language.text("content.support.workflow"))
                    ContentInfoCard(icon: "arrow.triangle.2.circlepath",
                                    title: language.text("content.support.statusSync.title"),
                                    description: language.text("content.support.statusSync.desc"),
                                    accent: EastwoodTheme.collectionsAccent)
                    ContentInfoCard(icon: "bubble.left.and.bubble.right.fill",
                                    title: language.text("content.support.inboxTracking.title"),
                                    description: language.text("content.support.inboxTracking.desc"),
                                    accent: EastwoodTheme.gold)
                }

                VStack(alignment: .leading, spacing: 8) {
                    ContentSectionHeader(title: language.text("content.quickActions"))
                    ContentActionLink(title: language.text("content.openInbox"), accent: EastwoodTheme.gold) {
                        NativeInboxView()
                    }
                    ContentActionLink(title: language.text("content.submitInquiry"), accent: EastwoodTheme.casesAccent) {
                        NativeInquiryFormView()
                    }
                }
            }
            .padding(pad)
        }
        .navigationTitle(language.text("content.support.title"))
        .navigationBarTitleDisplayMode(.inline)
        .eastwoodScreen()
    }
}

// MARK: - Consignment / Donation

struct NativeDonationView: View {
    @EnvironmentObject private var language: LanguageManager
    let artworks: [NativeArtwork]
    private let accent = EastwoodTheme.casesAccent

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        ScrollView {
            VStack(spacing: 14) {
                ContentPageHero(
                    title: language.text("content.donation.title"),
                    subtitle: language.text("content.donation.subtitle"),
                    icon: "hands.sparkles", accent: accent
                )

                VStack(alignment: .leading, spacing: 10) {
                    ContentSectionHeader(title: language.text("content.donation.path"))
                    ContentInfoCard(icon: "list.clipboard.fill",
                                    title: language.text("content.donation.cataloging.title"),
                                    description: language.text("content.donation.cataloging.desc"),
                                    accent: accent)
                    ContentInfoCard(icon: "magnifyingglass.circle.fill",
                                    title: language.text("content.donation.appraisal.title"),
                                    description: language.text("content.donation.appraisal.desc"),
                                    accent: EastwoodTheme.gold)
                }

                VStack(alignment: .leading, spacing: 10) {
                    ContentSectionHeader(title: language.text("content.donation.prepare"))
                    ContentInfoCard(icon: "doc.richtext.fill",
                                    title: language.text("content.donation.itemInfo.title"),
                                    description: language.text("content.donation.itemInfo.desc"),
                                    accent: EastwoodTheme.collectionsAccent)
                    ContentInfoCard(icon: "bubble.left.fill",
                                    title: language.text("content.donation.communication.title"),
                                    description: language.text("content.donation.communication.desc"),
                                    accent: EastwoodTheme.shopAccent)
                }

                VStack(alignment: .leading, spacing: 8) {
                    ContentSectionHeader(title: language.text("content.quickActions"))
                    ContentActionLink(title: language.text("content.startConsignment"), accent: EastwoodTheme.gold) {
                        NativeInquiryFormView()
                    }
                    ContentActionLink(title: language.text("content.openCases"), accent: accent) {
                        NativeSectionView(kind: .cases, artworks: artworks)
                    }
                }
            }
            .padding(pad)
        }
        .navigationTitle(language.text("content.donation.title"))
        .navigationBarTitleDisplayMode(.inline)
        .eastwoodScreen()
    }
}
