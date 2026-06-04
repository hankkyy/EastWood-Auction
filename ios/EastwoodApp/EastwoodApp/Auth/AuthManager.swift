import Foundation

@MainActor
final class AuthManager: ObservableObject {
    @Published var accessToken: String = ""
    @Published var currentUserId: String = ""
    @Published var userEmail: String = ""
    @Published var isAdmin: Bool = false
    @Published var role: String = "user"
    @Published var isLoading = false
    @Published var errorMessage: String?

    var isAuthenticated: Bool { !accessToken.isEmpty }

    init() {
        restoreSession()
    }

    func signIn(email: String, password: String) async {
        guard let supabaseURL = URL(string: AppConfig.supabaseURL),
              !AppConfig.supabaseAnonKey.isEmpty else {
            errorMessage = AppErrorPresenter.text("error.configMissing")
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            var req = URLRequest(url: supabaseURL.appendingPathComponent("auth/v1/token?grant_type=password"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
            req.httpBody = try JSONSerialization.data(withJSONObject: [
                "email": email,
                "password": password,
            ])

            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                throw URLError(.userAuthenticationRequired)
            }

            let decoded = try JSONDecoder().decode(SupabaseAuthResponse.self, from: data)
            accessToken = decoded.access_token
            currentUserId = decoded.user.id
            userEmail = decoded.user.email ?? email
            persistSession()
            await refreshRole()
        } catch {
            if let urlError = error as? URLError, urlError.code == .userAuthenticationRequired {
                errorMessage = AppErrorPresenter.text("error.signInFailed")
            } else {
                errorMessage = AppErrorPresenter.message(for: error)
            }
        }

        isLoading = false
    }

    func signOut() {
        accessToken = ""
        currentUserId = ""
        userEmail = ""
        isAdmin = false
        role = "user"
        KeychainStore.clearToken()
        UserDefaults.standard.removeObject(forKey: "eastwood_user_id")
        UserDefaults.standard.removeObject(forKey: "eastwood_user_email")
        UserDefaults.standard.removeObject(forKey: "eastwood_user_role")
    }

    func refreshRole() async {
        guard let base = AppConfig.webAppURL, !accessToken.isEmpty else { return }
        do {
            var req = URLRequest(url: base.appendingPathComponent("api/mobile/me"))
            req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return }
            let me = try JSONDecoder().decode(MobileMeResponse.self, from: data)
            currentUserId = me.userId
            isAdmin = me.isAdmin
            role = me.role
            persistSession()
        } catch {
            return
        }
    }

    private func restoreSession() {
        if let savedToken = KeychainStore.loadToken() {
            accessToken = savedToken
        }
        currentUserId = UserDefaults.standard.string(forKey: "eastwood_user_id") ?? ""
        userEmail = UserDefaults.standard.string(forKey: "eastwood_user_email") ?? ""
        role = UserDefaults.standard.string(forKey: "eastwood_user_role") ?? "user"
        isAdmin = role == "admin"
    }

    private func persistSession() {
        if !accessToken.isEmpty {
            KeychainStore.saveToken(accessToken)
        }
        UserDefaults.standard.set(currentUserId, forKey: "eastwood_user_id")
        UserDefaults.standard.set(userEmail, forKey: "eastwood_user_email")
        UserDefaults.standard.set(role, forKey: "eastwood_user_role")
    }
}
