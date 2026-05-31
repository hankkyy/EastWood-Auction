import Foundation

enum APIClientError: LocalizedError {
    case badURL
    case unauthorized
    case server(String)
    case network

    var errorDescription: String? {
        switch self {
        case .badURL:
            return "Invalid URL"
        case .unauthorized:
            return "Unauthorized"
        case .server(let message):
            return message
        case .network:
            return "Network error"
        }
    }
}

struct NativeAPIClient {
    let baseURL: URL

    init?() {
        guard let baseURL = AppConfig.webAppURL else { return nil }
        self.baseURL = baseURL
    }

    func requestJSON(path: String,
                     method: String = "GET",
                     token: String? = nil,
                     body: [String: Any]? = nil,
                     timeout: TimeInterval = 20,
                     retries: Int = 1) async throws -> Data {
        var attempt = 0
        var lastError: Error?

        while attempt <= retries {
            do {
                var req = URLRequest(url: baseURL.appendingPathComponent(path))
                req.httpMethod = method
                req.timeoutInterval = timeout
                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                if let token, !token.isEmpty {
                    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                if let body {
                    req.httpBody = try JSONSerialization.data(withJSONObject: body)
                }

                let (data, response) = try await URLSession.shared.data(for: req)
                guard let http = response as? HTTPURLResponse else {
                    throw APIClientError.network
                }

                if (200...299).contains(http.statusCode) {
                    return data
                }

                if http.statusCode == 401 || http.statusCode == 403 {
                    throw APIClientError.unauthorized
                }

                if let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = payload["error"] as? String,
                   !message.isEmpty {
                    throw APIClientError.server(message)
                }

                throw APIClientError.server("Request failed: \(http.statusCode)")
            } catch {
                lastError = error
                attempt += 1
                if attempt <= retries {
                    try? await Task.sleep(nanoseconds: 500_000_000)
                }
            }
        }

        throw lastError ?? APIClientError.network
    }
}
