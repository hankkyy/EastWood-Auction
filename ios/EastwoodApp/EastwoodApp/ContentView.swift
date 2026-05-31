import SwiftUI

struct ContentView: View {
    @StateObject private var networkMonitor = NetworkMonitor()
    @StateObject private var webViewModel = WebViewModel()
    @StateObject private var notificationManager = NotificationManager.shared
    @State private var isShowingShareSheet = false

    var body: some View {
        NavigationStack {
            Group {
                if let url = AppConfig.webAppURL {
                    ZStack {
                        EastwoodWebView(viewModel: webViewModel, url: url)

                        if webViewModel.isLoading {
                            ProgressView("Loading Eastwood...")
                                .padding(12)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                        }

                        if webViewModel.showLoadError {
                            VStack(spacing: 12) {
                                Text("页面加载失败")
                                    .font(.headline)
                                Text("请检查网络或稍后重试")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                Button("重试") {
                                    webViewModel.reload()
                                }
                                .buttonStyle(.borderedProminent)
                            }
                            .padding(20)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                        }
                    }
                } else {
                    VStack(spacing: 12) {
                        Text("配置错误")
                            .font(.headline)
                        Text("请在 AppConfig.swift 中设置有效的线上网址")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                }
            }
            .navigationTitle(webViewModel.pageTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isShowingShareSheet = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .disabled(webViewModel.currentURL == nil)
                }
            }
            .safeAreaInset(edge: .bottom) {
                HStack(spacing: 20) {
                    Button {
                        webViewModel.goBack()
                    } label: {
                        Label("返回", systemImage: "chevron.left")
                    }
                    .disabled(!webViewModel.canGoBack)

                    Button {
                        webViewModel.reload()
                    } label: {
                        Label("刷新", systemImage: "arrow.clockwise")
                    }
                }
                .font(.footnote)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(.thinMaterial)
            }
            .overlay(alignment: .top) {
                if !networkMonitor.isConnected {
                    Text("当前网络不可用")
                        .font(.footnote)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.9), in: Capsule())
                        .padding(.top, 8)
                }
            }
            .sheet(isPresented: $isShowingShareSheet) {
                if let currentURL = webViewModel.currentURL {
                    ShareSheet(items: [webViewModel.pageTitle, currentURL])
                }
            }
            .onReceive(notificationManager.$pendingDeepLinkURL.compactMap { $0 }) { deepLink in
                webViewModel.open(deepLink)
                notificationManager.pendingDeepLinkURL = nil
            }
            .onReceive(notificationManager.$latestDeviceToken.compactMap { $0 }) { _ in
                Task {
                    await syncPushTokenIfPossible()
                }
            }
            .onReceive(webViewModel.$currentURL.compactMap { $0 }) { _ in
                Task {
                    await syncPushTokenIfPossible()
                }
            }
        }
    }

    private func syncPushTokenIfPossible() async {
        guard let baseURL = AppConfig.webAppURL else { return }
        guard let accessToken = await webViewModel.fetchSupabaseAccessToken(), !accessToken.isEmpty else { return }
        await notificationManager.syncDeviceTokenToBackend(accessToken: accessToken, websiteBaseURL: baseURL)
    }
}

#Preview {
    ContentView()
}
