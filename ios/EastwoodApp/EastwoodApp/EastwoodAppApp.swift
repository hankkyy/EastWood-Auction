import SwiftUI
import UIKit

@main
struct EastwoodAppApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var languageManager = LanguageManager()

    init() {
        configureAppearance()
    }

    private func configureAppearance() {
        // Navigation bar
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.titleTextAttributes = [.foregroundColor: UIColor.label]
        nav.largeTitleTextAttributes = [.foregroundColor: UIColor.label]
        nav.shadowColor = UIColor.separator.withAlphaComponent(0.12)
        UINavigationBar.appearance().isTranslucent = false
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
        UINavigationBar.appearance().tintColor = UIColor(EastwoodTheme.gold)

        // Tab bar
        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.shadowColor = UIColor.separator.withAlphaComponent(0.12)
        let selectionColor = UIColor(EastwoodTheme.gold)
        let unselectedColor = UIColor(EastwoodTheme.mutedText)
        UITabBar.appearance().isTranslucent = true
        [tab.stackedLayoutAppearance, tab.inlineLayoutAppearance, tab.compactInlineLayoutAppearance].forEach { a in
            a.selected.iconColor = selectionColor
            a.selected.titleTextAttributes = [.foregroundColor: selectionColor]
            a.normal.iconColor = unselectedColor
            a.normal.titleTextAttributes = [.foregroundColor: unselectedColor]
        }
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(languageManager)
                .environment(\.locale, languageManager.language.locale)
        }
    }
}
