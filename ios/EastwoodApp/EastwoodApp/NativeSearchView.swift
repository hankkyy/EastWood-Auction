import SwiftUI
import UIKit

struct NativeSearchView: View {
    let artworks: [NativeArtwork]
    @State private var query = ""

    private var filtered: [NativeArtwork] {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if text.isEmpty { return artworks }
        return artworks.filter {
            $0.title.lowercased().contains(text)
            || ($0.titleZh ?? "").lowercased().contains(text)
            || $0.category.lowercased().contains(text)
            || $0.period.lowercased().contains(text)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(filtered) { artwork in
                        NavigationLink(value: artwork) { NativeArtworkCard(artwork: artwork) }
                            .buttonStyle(.plain)
                            .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                    }
                }
                .padding(12)
            }
            .scrollIndicators(.hidden)
            .animation(EastwoodMotion.listUpdate, value: filtered.count)
            .navigationTitle("Search")
            .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
            .searchable(text: $query, prompt: "Search artworks")
            .background(EastwoodBackground())
            .eastwoodEnterMotion(id: "search-page")
        }
    }
}
