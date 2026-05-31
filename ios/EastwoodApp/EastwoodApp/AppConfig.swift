import Foundation

enum AppConfig {
    static let webAppURLString = "https://eastwoodauction.vercel.app/"
    static let deviceTokenRegisterPath = "/api/mobile/device-token"
    static let mobileApiSecret = ""

    static var webAppURL: URL? {
        URL(string: webAppURLString)
    }

    static let allowedHostSuffixes = [
        "eastwoodauction.vercel.app"
    ]
}
