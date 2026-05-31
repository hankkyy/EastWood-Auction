import SwiftUI
import UniformTypeIdentifiers
import WebKit

struct EastwoodWebView: UIViewRepresentable {
    @ObservedObject var viewModel: WebViewModel
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .onDrag

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.refreshPulled(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
        context.coordinator.observeProgress(on: webView)

        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        viewModel.webView = webView

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, UIDocumentPickerDelegate {
        var parent: EastwoodWebView
        private var fileSelectionCompletion: (([URL]?) -> Void)?
        private var progressObservation: NSKeyValueObservation?

        init(_ parent: EastwoodWebView) {
            self.parent = parent
        }

        @objc func refreshPulled(_ sender: UIRefreshControl) {
            parent.viewModel.webView?.reload()
            sender.endRefreshing()
        }

        func observeProgress(on webView: WKWebView) {
            progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] observed, _ in
                Task { @MainActor in
                    self?.parent.viewModel.estimatedProgress = observed.estimatedProgress
                }
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.viewModel.isLoading = true
            parent.viewModel.showLoadError = false
            parent.viewModel.updateFromWebView(webView)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.viewModel.isLoading = false
            parent.viewModel.updateFromWebView(webView)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.viewModel.isLoading = false
            parent.viewModel.showLoadError = true
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            parent.viewModel.isLoading = false
            parent.viewModel.showLoadError = true
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if shouldOpenExternally(url: url) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        private func shouldOpenExternally(url: URL) -> Bool {
            guard let host = url.host else {
                return false
            }

            let isAllowedHost = AppConfig.allowedHostSuffixes.contains { host == $0 || host.hasSuffix("." + $0) }
            let isHTTPFamily = url.scheme == "http" || url.scheme == "https"

            return isHTTPFamily && !isAllowedHost
        }

        @available(iOS 18.4, *)
        func webView(_ webView: WKWebView,
                     runOpenPanelWith parameters: WKOpenPanelParameters,
                     initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping ([URL]?) -> Void) {
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let root = scene.windows.first?.rootViewController else {
                completionHandler(nil)
                return
            }

            fileSelectionCompletion = completionHandler

            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.image, UTType.movie, UTType.data], asCopy: true)
            picker.allowsMultipleSelection = parameters.allowsMultipleSelection
            picker.delegate = self
            root.present(picker, animated: true)
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            fileSelectionCompletion?(urls)
            fileSelectionCompletion = nil
        }

        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            fileSelectionCompletion?(nil)
            fileSelectionCompletion = nil
        }

        deinit {
            progressObservation?.invalidate()
        }
    }
}
