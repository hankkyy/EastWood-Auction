import SwiftUI
import UIKit

@main
struct EastwoodAppApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var languageManager = LanguageManager()

    init() {
        let appBackground = UIColor(red: 0.96, green: 0.96, blue: 0.97, alpha: 1.0)
        UIWindow.appearance().backgroundColor = appBackground

        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = appBackground
        nav.titleTextAttributes = [.foregroundColor: UIColor.label]
        nav.largeTitleTextAttributes = [.foregroundColor: UIColor.label]
        nav.shadowColor = UIColor.separator.withAlphaComponent(0.18)
        UINavigationBar.appearance().isTranslucent = false
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
        UINavigationBar.appearance().tintColor = UIColor(EastwoodTheme.gold)

        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = appBackground
        tab.shadowColor = UIColor.separator.withAlphaComponent(0.18)
        let selectedColor = UIColor(EastwoodTheme.gold)
        let normalColor = UIColor(EastwoodTheme.mutedText)
        UITabBar.appearance().isTranslucent = false
        [tab.stackedLayoutAppearance, tab.inlineLayoutAppearance, tab.compactInlineLayoutAppearance].forEach { appearance in
            appearance.selected.iconColor = selectedColor
            appearance.selected.titleTextAttributes = [.foregroundColor: selectedColor]
            appearance.normal.iconColor = normalColor
            appearance.normal.titleTextAttributes = [.foregroundColor: normalColor]
        }
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
        UITabBar.appearance().tintColor = selectedColor
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.light)
                .environmentObject(languageManager)
                .environment(\.locale, languageManager.language.locale)
        }
    }
}
