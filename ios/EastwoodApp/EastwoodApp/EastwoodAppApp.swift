import SwiftUI

@main
struct EastwoodAppApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = UIColor(EastwoodTheme.ink)
        nav.titleTextAttributes = [.foregroundColor: UIColor(EastwoodTheme.goldSoft)]
        nav.largeTitleTextAttributes = [.foregroundColor: UIColor(EastwoodTheme.goldSoft)]
        nav.shadowColor = UIColor.white.withAlphaComponent(0.08)
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
        UINavigationBar.appearance().tintColor = UIColor(EastwoodTheme.gold)

        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = UIColor(EastwoodTheme.ink)
        tab.shadowColor = UIColor.white.withAlphaComponent(0.08)
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
