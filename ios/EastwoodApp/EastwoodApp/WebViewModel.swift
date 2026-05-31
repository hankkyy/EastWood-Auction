import Foundation
import WebKit

@MainActor
final class WebViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var canGoBack = false
    @Published var pageTitle = "Eastwood"
    @Published var showLoadError = false
    @Published var currentURL: URL?

    weak var webView: WKWebView?

    func reload() {
        webView?.reload()
    }

    func goBack() {
        webView?.goBack()
    }

    func updateFromWebView(_ webView: WKWebView) {
        self.webView = webView
        canGoBack = webView.canGoBack
        pageTitle = webView.title ?? "Eastwood"
        currentURL = webView.url
    }

    func open(_ url: URL) {
        webView?.load(URLRequest(url: url))
    }

    func fetchSupabaseAccessToken() async -> String? {
        guard let webView else { return nil }

        let script = """
        (function() {
          try {
            for (var i = 0; i < localStorage.length; i++) {
              var key = localStorage.key(i);
              if (key && key.indexOf('sb-') === 0 && key.indexOf('-auth-token') > 0) {
                var raw = localStorage.getItem(key);
                if (!raw) continue;
                var parsed = JSON.parse(raw);
                if (parsed && parsed.access_token) return parsed.access_token;
                if (parsed && parsed.currentSession && parsed.currentSession.access_token) return parsed.currentSession.access_token;
              }
            }
            return null;
          } catch (e) {
            return null;
          }
        })();
        """

        return await withCheckedContinuation { continuation in
            webView.evaluateJavaScript(script) { result, _ in
                continuation.resume(returning: result as? String)
            }
        }
    }
}
