import SwiftUI
import UIKit

struct NativeSearchView: View {
    @EnvironmentObject private var language: LanguageManager
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
                        NavigationLink(value: artwork) { NativeArtworkListRow(artwork: artwork) }
                            .buttonStyle(.plain)
                            .simultaneousGesture(TapGesture().onEnded { UIImpactFeedbackGenerator(style: .light).impactOccurred() })
                    }
                }
                .padding(12)
            }
            .scrollIndicators(.hidden)
            .animation(EastwoodMotion.listUpdate, value: filtered.count)
            .navigationTitle(language.text("search.title"))
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: NativeArtwork.self) { NativeArtworkDetailView(artwork: $0) }
            .searchable(text: $query, prompt: language.text("search.prompt"))
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .eastwoodScreen()
            .eastwoodEnterMotion(id: "search-page")
        }
    }
}
