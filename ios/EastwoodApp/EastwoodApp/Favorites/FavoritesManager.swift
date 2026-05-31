import Foundation

@MainActor
final class FavoritesManager: ObservableObject {
    @Published private(set) var favoriteIDs: Set<String> = []
    @Published var isSyncing = false

    func clear() {
        favoriteIDs = []
    }

    func load(token: String) async {
        guard let baseURL = AppConfig.webAppURL else { return }

        isSyncing = true
        defer { isSyncing = false }

        do {
            var req = URLRequest(url: baseURL.appendingPathComponent("api/favorites"))
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else { return }
            if http.statusCode == 401 || http.statusCode == 403 {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
                return
            }
            guard (200...299).contains(http.statusCode) else { return }
            let decoded = try JSONDecoder().decode(FavoriteListResponse.self, from: data)
            favoriteIDs = Set(decoded.favorites.map { $0.artwork_id })
        } catch {
            return
        }
    }

    func toggle(artworkId: String, token: String) async {
        if favoriteIDs.contains(artworkId) {
            await remove(artworkId: artworkId, token: token)
        } else {
            await add(artworkId: artworkId, token: token)
        }
    }

    private func add(artworkId: String, token: String) async {
        guard let baseURL = AppConfig.webAppURL else { return }
        do {
            var req = URLRequest(url: baseURL.appendingPathComponent("api/favorites"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.httpBody = try JSONSerialization.data(withJSONObject: ["artworkId": artworkId])
            let (_, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else { return }
            if http.statusCode == 401 || http.statusCode == 403 {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
                return
            }
            guard (200...299).contains(http.statusCode) else { return }
            favoriteIDs.insert(artworkId)
        } catch {
            return
        }
    }

    private func remove(artworkId: String, token: String) async {
        guard let baseURL = AppConfig.webAppURL else { return }
        do {
            var req = URLRequest(url: baseURL.appendingPathComponent("api/favorites/\(artworkId)"))
            req.httpMethod = "DELETE"
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            let (_, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else { return }
            if http.statusCode == 401 || http.statusCode == 403 {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
                return
            }
            guard (200...299).contains(http.statusCode) else { return }
            favoriteIDs.remove(artworkId)
        } catch {
            return
        }
    }
}
