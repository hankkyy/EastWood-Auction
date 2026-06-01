import SwiftUI

struct NativeMoreView: View {
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
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Content Modules")
                            .font(.headline)
                            .foregroundStyle(EastwoodTheme.goldSoft)
                        navRow("Exhibitions", "sparkles") { NativeExhibitionsView(artworks: artworks) }
                        navRow("Visit", "map") { NativeVisitView(artworks: artworks) }
                        navRow("Support", "lifepreserver") { NativeSupportView(artworks: artworks) }
                        navRow("Donation", "hands.sparkles") { NativeDonationView(artworks: artworks) }
                    }
                    .padding(14)
                    .eastwoodPanel()

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Quick Stats")
                            .font(.headline)
                            .foregroundStyle(EastwoodTheme.goldSoft)
                        row("Cloud Artworks", value: "\(artworks.count)")
                        row("Shop Items", value: "\(shopCount)")
                        row("Case Records", value: "\(caseCount)")
                    }
                    .padding(14)
                    .eastwoodPanel()
                }
                .padding(.horizontal, pad)
                .padding(.vertical, 12)
            }
            .background(EastwoodBackground())
            .navigationTitle("More")
            .eastwoodEnterMotion(id: "more-page")
        }
    }

    private func row(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
        }
    }

    private func navRow<Destination: View>(_ title: String, _ systemImage: String, @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .foregroundStyle(EastwoodTheme.goldSoft)
                    .frame(width: 22)
                Text(title)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
