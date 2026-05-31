import Foundation

enum AppConfig {
    static let webAppURLString = "https://eastwoodauction.vercel.app/"
    static let supabaseURL = "https://rsleemziyoiyluvycixf.supabase.co"
    static let supabaseAnonKey = "sb_publishable_SBa5JdzQawsw2U7khRciKw_Tr76CuXT"
    static let deviceTokenRegisterPath = "/api/mobile/device-token"
    static let mobileApiSecret = ""

    static var webAppURL: URL? {
        URL(string: webAppURLString)
    }

    static let allowedHostSuffixes = [
        "eastwoodauction.vercel.app"
    ]
}
