import SwiftUI

struct NativeExhibitionsView: View {
    let artworks: [NativeArtwork]

    private var highlighted: [NativeArtwork] {
        Array(artworks.prefix(6))
    }

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHeader(
                    title: "Exhibitions",
                    subtitle: "Special and online exhibition highlights from Eastwood Auction."
                )

                sectionTitle("Special Exhibitions")
                infoCard("On-site Highlights", "Explore rotating curation themes and specialist-led showcase selections.")
                infoCard("Online Viewing", "Browse selected catalog lots and exhibition previews online.")

                sectionTitle("Featured Works")
                LazyVStack(spacing: 10) {
                    ForEach(highlighted) { artwork in
                        NavigationLink(value: artwork) {
                            NativeArtworkCard(artwork: artwork)
                        }
                        .buttonStyle(.plain)
                    }
                }

                sectionTitle("Browse More")
                infoCard("Event Feed", "Exhibition cards and featured lots are updated from cloud inventory.")
                infoCard("Collector Support", "Create an account to save items and track inquiry progress.")

                sectionTitle("Quick Actions")
                NavigationLink("Open Antique Shop") {
                    NativeSectionView(kind: .shop, artworks: artworks)
                }
                .buttonStyle(EastwoodSecondaryButtonStyle())
                NavigationLink("Open Collections") {
                    NativeSectionView(kind: .collections, artworks: artworks)
                }
                .buttonStyle(EastwoodSecondaryButtonStyle())
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle("Exhibitions")
        .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
        .background(EastwoodBackground())
    }
}

struct NativeVisitView: View {
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHeader(
                    title: "Visit",
                    subtitle: "Plan your consultation and auction viewing experience."
                )

                sectionTitle("Before Your Visit")
                infoCard("Appointment Recommended", "Send an inquiry in advance to confirm availability, condition, and pricing.")
                infoCard("Preparation", "Bring provenance photos, invoices, and condition notes for faster review.")
                infoCard("Image Search", "Use image search first if you want to find similar antiques from catalog.")

                sectionTitle("On-site Support")
                infoCard("Consultation", "Specialists provide valuation references and consignment suggestions.")
                infoCard("Consignment Guidance", "We explain listing strategy, reserve pricing, and risk notes clearly.")
                infoCard("Policy Notes", "Shipping, pickup, and payment details are finalized after inquiry confirmation.")

                sectionTitle("Quick Actions")
                NavigationLink("Open Inquiries") { NativeInquiryFormView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                NavigationLink("Open Image Search") { NativeImageSearchView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle("Visit")
        .background(EastwoodBackground())
    }
}

struct NativeSupportView: View {
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHeader(
                    title: "Support",
                    subtitle: "Browse, consign, inquire, and purchase with confidence."
                )

                sectionTitle("Service Areas")
                infoCard("Collector Account", "Create an account to save favorites and follow inquiry updates.")
                infoCard("Consign", "Submit antique items for review and let our team prepare buyer-facing presentation.")
                infoCard("Shop Antiques", "Browse available antiques, decorative objects, and collectible works online.")

                sectionTitle("Inquiry Workflow")
                infoCard("Status Sync", "Pending -> Processed -> Archived states remain synced with cloud status.")
                infoCard("Inbox Tracking", "View replies, unread updates, and historical messages in one thread.")

                sectionTitle("Quick Actions")
                NavigationLink("Open Inbox") { NativeInboxView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                NavigationLink("Submit Inquiry") { NativeInquiryFormView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle("Support")
        .background(EastwoodBackground())
    }
}

struct NativeDonationView: View {
    let artworks: [NativeArtwork]

    var body: some View {
        let pageWidth = UIScreen.main.bounds.width
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                pageHeader(
                    title: "Donation",
                    subtitle: "Consign with Eastwood Auction and bring antiques to market."
                )

                sectionTitle("Consignment Path")
                infoCard("Cataloging Support", "We assist with cataloging, presentation, and buyer matching.")
                infoCard("Appraisal Request", "Share item details and photos for preliminary evaluation.")

                sectionTitle("What to Prepare")
                infoCard("Item Information", "Provide item background, condition notes, and provenance records when available.")
                infoCard("Communication", "Our team follows up in inbox to confirm next steps.")

                sectionTitle("Quick Actions")
                NavigationLink("Start a Consignment") { NativeInquiryFormView() }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                NavigationLink("Open Return Cases") { NativeSectionView(kind: .cases, artworks: artworks) }
                    .buttonStyle(EastwoodSecondaryButtonStyle())
            }
            .padding(EastwoodLayout.pagePadding(for: pageWidth))
        }
        .navigationTitle("Donation")
        .background(EastwoodBackground())
    }
}

private func pageHeader(title: String, subtitle: String) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(title)
            .font(.largeTitle.weight(.bold))
        Text(subtitle)
            .font(.subheadline)
            .foregroundStyle(.secondary)
    }
}

private func sectionTitle(_ text: String) -> some View {
    Text(text)
        .font(.headline)
        .padding(.top, 4)
}

private func infoCard(_ title: String, _ desc: String) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(title).font(.headline)
        Text(desc).font(.subheadline).foregroundStyle(.secondary)
    }
    .padding(12)
    .eastwoodPanel()
}
