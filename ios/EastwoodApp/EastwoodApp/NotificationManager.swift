import Foundation
import UIKit
import UserNotifications

final class NotificationManager: NSObject, ObservableObject {
    static let shared = NotificationManager()

    @Published var pendingDeepLinkURL: URL?
    @Published var latestDeviceToken: String?

    private override init() {
        super.init()
    }

    func configure() {
        UNUserNotificationCenter.current().delegate = self
    }

    func requestAuthorizationAndRegister() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func handleDeviceToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("APNs token: \(token)")
        DispatchQueue.main.async {
            self.latestDeviceToken = token
        }
    }

    func handleRemoteNotification(userInfo: [AnyHashable: Any]) {
        guard let urlString = userInfo["url"] as? String,
              let url = URL(string: urlString) else {
            return
        }

        DispatchQueue.main.async {
            self.pendingDeepLinkURL = url
        }
    }

    func syncDeviceTokenToBackend(accessToken: String, websiteBaseURL: URL) async {
        guard let latestDeviceToken else { return }

        let endpoint = websiteBaseURL.appendingPathComponent(
            AppConfig.deviceTokenRegisterPath.hasPrefix("/") ? String(AppConfig.deviceTokenRegisterPath.dropFirst()) : AppConfig.deviceTokenRegisterPath
        )
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        if !AppConfig.mobileApiSecret.isEmpty {
            request.setValue(AppConfig.mobileApiSecret, forHTTPHeaderField: "x-eastwood-mobile-secret")
        }

        let payload: [String: Any] = [
            "token": latestDeviceToken,
            "installationId": installationId(),
            "platform": "ios",
            "appVersion": appVersionString(),
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            _ = try await URLSession.shared.data(for: request)
        } catch {
            print("Device token sync failed: \(error.localizedDescription)")
        }
    }

    private func installationId() -> String {
        let key = "eastwood.installation.id"
        if let existing = UserDefaults.standard.string(forKey: key), !existing.isEmpty {
            return existing
        }
        let value = UUID().uuidString
        UserDefaults.standard.set(value, forKey: key)
        return value
    }

    private func appVersionString() -> String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version)(\(build))"
    }
}

extension NotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        handleRemoteNotification(userInfo: response.notification.request.content.userInfo)
        completionHandler()
    }
}
