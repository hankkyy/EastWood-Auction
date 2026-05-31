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
        NavigationStack {
            List {
                Section("Content Modules") {
                    NavigationLink("Exhibitions") { NativeExhibitionsView(artworks: artworks) }
                    NavigationLink("Visit") { NativeVisitView(artworks: artworks) }
                    NavigationLink("Support") { NativeSupportView(artworks: artworks) }
                    NavigationLink("Donation") { NativeDonationView(artworks: artworks) }
                }

                Section("Quick Stats") {
                    row("Cloud Artworks", value: "\(artworks.count)")
                    row("Shop Items", value: "\(shopCount)")
                    row("Case Records", value: "\(caseCount)")
                }
            }
            .scrollContentBackground(.hidden)
            .background(EastwoodBackground())
            .navigationTitle("More")
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
}
