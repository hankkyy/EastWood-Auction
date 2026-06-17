import SwiftUI

// MARK: - Layout

enum EastwoodLayout {
    static func pagePadding(for width: CGFloat) -> CGFloat {
        if width < 380 { return 14 }
        if width < 430 { return 16 }
        return 20
    }

    static func cardImageHeight(for width: CGFloat) -> CGFloat {
        min(max(width * 0.36, 140), 200)
    }

    static func heroImageHeight(for width: CGFloat) -> CGFloat {
        min(max(width * 0.52, 220), 320)
    }

    static func listThumbSize(for width: CGFloat) -> CGFloat {
        width < 390 ? 72 : 80
    }

    static func compactCardHeight(for width: CGFloat) -> CGFloat {
        width < 390 ? 320 : 340
    }
}

// MARK: - Theme (小红书 + App Store inspired)

enum EastwoodTheme {
    // Primary — warm antique gold
    static let gold        = Color(red: 0.78, green: 0.64, blue: 0.35)  // #C7A359
    static let goldLight   = Color(red: 0.91, green: 0.85, blue: 0.72)  // #E8D9B8
    static let goldDark    = Color(red: 0.58, green: 0.42, blue: 0.18)  // #946B2E

    // 小红书 signature red
    static let redAccent   = Color(red: 0.93, green: 0.22, blue: 0.22)  // #ED3838

    // Text
    static let ink         = Color(red: 0.13, green: 0.11, blue: 0.10)  // #211C1A
    static let inkSoft     = Color(red: 0.28, green: 0.25, blue: 0.22)  // #474038
    static let inkMuted    = Color(red: 0.55, green: 0.52, blue: 0.48)  // #8C857A

    // Backgrounds — 小红书 warm white
    static let bg          = Color(red: 0.98, green: 0.97, blue: 0.96)  // #FAF8F5
    static let bgCard      = Color.white
    static let bgElevated  = Color(red: 0.99, green: 0.99, blue: 0.98)

    // Panel / Surface
    static let panel       = Color.white
    static let panelSoft   = Color(red: 0.97, green: 0.96, blue: 0.95)
    static let panelWarm   = Color(red: 0.99, green: 0.97, blue: 0.95)

    // Semantic
    static let hairline    = Color.black.opacity(0.06)
    static let shadowLight = Color.black.opacity(0.03)
    static let shadowMid   = Color.black.opacity(0.05)
    static let shadowCard  = Color.black.opacity(0.06)

    // Section accents (subtle)
    static let collectionsAccent = Color(red: 0.45, green: 0.55, blue: 0.65)
    static let shopAccent       = Color(red: 0.75, green: 0.55, blue: 0.35)
    static let casesAccent      = Color(red: 0.48, green: 0.60, blue: 0.50)

    // Inputs
    static let searchFill  = Color(red: 0.95, green: 0.94, blue: 0.92)
    static let inputBorder = Color.black.opacity(0.07)

    // Status
    static let success     = Color(red: 0.30, green: 0.65, blue: 0.40)
    static let warning     = Color(red: 0.92, green: 0.55, blue: 0.20)

    // Legacy aliases
    static let ivory       = bgElevated
    static let mistBlue    = collectionsAccent.opacity(0.45)
    static let sage        = casesAccent.opacity(0.45)
    static let blush       = Color(red: 0.95, green: 0.88, blue: 0.86)
    static let sand        = shopAccent.opacity(0.45)
    static let goldSoft    = goldLight
    static let mutedText   = inkMuted
    static let groupedTop  = bgElevated
    static let groupedBottom = panelSoft
    static let error       = redAccent
}

// MARK: - Motion

enum EastwoodMotion {
    static let pageEnter   = Animation.spring(response: 0.40, dampingFraction: 0.88)
    static let listUpdate  = Animation.spring(response: 0.35, dampingFraction: 0.85)
    static let tabSwitch   = Animation.spring(response: 0.30, dampingFraction: 0.82)
    static let buttonTap   = Animation.spring(response: 0.25, dampingFraction: 0.75)
    static let cardAppear  = Animation.spring(response: 0.45, dampingFraction: 0.82)
}

// MARK: - Background

struct EastwoodBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            if colorScheme == .dark {
                Color(red: 0.08, green: 0.08, blue: 0.08).ignoresSafeArea()
            } else {
                EastwoodTheme.bg.ignoresSafeArea()

                // 小红书温暖光晕 — 右上
                RadialGradient(
                    colors: [EastwoodTheme.goldLight.opacity(0.10), Color.clear],
                    center: .topTrailing, startRadius: 30, endRadius: 380
                ).ignoresSafeArea()

                // 冷调平衡 — 左下
                RadialGradient(
                    colors: [Color(red: 0.82, green: 0.88, blue: 0.93).opacity(0.08), Color.clear],
                    center: .bottomLeading, startRadius: 20, endRadius: 320
                ).ignoresSafeArea()
            }
        }
    }
}

// MARK: - Panel Modifier

struct EastwoodPanelModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(colorScheme == .dark
                        ? Color(red: 0.15, green: 0.15, blue: 0.15)
                        : EastwoodTheme.panel)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(EastwoodTheme.hairline, lineWidth: 0.5)
            )
            .shadow(color: EastwoodTheme.shadowLight, radius: 6, y: 2)
    }
}

// MARK: - Card Modifier (for 小红书-style cards)

struct EastwoodCardModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(colorScheme == .dark
                        ? Color(red: 0.18, green: 0.18, blue: 0.18)
                        : Color.white)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.black.opacity(0.04), lineWidth: 0.5)
            )
            .shadow(color: Color.black.opacity(0.03), radius: 4, y: 2)
    }
}

// MARK: - Input Modifier

struct EastwoodInputModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(colorScheme == .dark
                        ? Color(red: 0.20, green: 0.20, blue: 0.20)
                        : EastwoodTheme.searchFill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(EastwoodTheme.inputBorder, lineWidth: 0.5)
            )
    }
}

// MARK: - Primary Button Style

struct EastwoodPrimaryButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 48)  // iOS HIG: 44pt minimum touch target
            .background(
                LinearGradient(
                    colors: isEnabled
                        ? [EastwoodTheme.goldLight, EastwoodTheme.gold, EastwoodTheme.goldDark]
                        : [Color.gray.opacity(0.4), Color.gray.opacity(0.3)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .opacity(configuration.isPressed ? 0.88 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(EastwoodMotion.buttonTap, value: configuration.isPressed)
            .shadow(color: EastwoodTheme.gold.opacity(0.18), radius: 8, y: 3)
    }
}

// MARK: - Secondary Button Style

struct EastwoodSecondaryButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .foregroundStyle(EastwoodTheme.goldDark)
            .padding(.horizontal, 18)
            .frame(minHeight: 44)  // iOS HIG minimum touch target
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(colorScheme == .dark
                        ? Color(red: 0.20, green: 0.20, blue: 0.20)
                        : EastwoodTheme.panelWarm)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(EastwoodTheme.gold.opacity(0.18), lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.88 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(EastwoodMotion.buttonTap, value: configuration.isPressed)
    }
}

// MARK: - View Extensions

extension View {
    func eastwoodPanel() -> some View { modifier(EastwoodPanelModifier()) }
    func eastwoodCard() -> some View { modifier(EastwoodCardModifier()) }
    func eastwoodInput() -> some View { modifier(EastwoodInputModifier()) }
    func eastwoodScreen() -> some View { modifier(EastwoodScreenModifier()) }
    func eastwoodFillScreen(alignment: Alignment = .top) -> some View {
        frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment)
    }
}

struct EastwoodScreenModifier: ViewModifier {
    func body(content: Content) -> some View {
        ZStack(alignment: .top) {
            EastwoodBackground()
            content.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
}

// MARK: - Skeleton Loading

struct EastwoodShimmer: View {
    @State private var phase: CGFloat = -0.8
    var body: some View {
        LinearGradient(
            colors: [
                Color.white.opacity(0.02),
                Color.white.opacity(0.15),
                Color.white.opacity(0.02),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .rotationEffect(.degrees(12))
        .offset(x: phase * 320)
        .onAppear {
            withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                phase = 0.9
            }
        }
    }
}

struct EastwoodSkeletonCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.black.opacity(0.06))
                .frame(height: 140)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 14)))

            RoundedRectangle(cornerRadius: 6)
                .fill(Color.black.opacity(0.06))
                .frame(height: 16)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 6)))

            RoundedRectangle(cornerRadius: 6)
                .fill(Color.black.opacity(0.05))
                .frame(width: 120, height: 12)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 6)))
        }
        .padding(12)
        .eastwoodPanel()
    }
}

struct EastwoodCompactSkeletonCard: View {
    private var compactCardHeight: CGFloat {
        EastwoodLayout.compactCardHeight(for: UIScreen.main.bounds.width)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.black.opacity(0.06))
                .frame(height: compactCardHeight * 0.60)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 12)))

            RoundedRectangle(cornerRadius: 6)
                .fill(Color.black.opacity(0.06))
                .frame(height: 14)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 6)))

            RoundedRectangle(cornerRadius: 6)
                .fill(Color.black.opacity(0.05))
                .frame(width: 80, height: 10)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 6)))
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(EastwoodTheme.panelSoft)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 0.5)
        )
        .frame(height: compactCardHeight)
    }
}

struct EastwoodSkeletonList: View {
    let count: Int

    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<count, id: \.self) { _ in
                EastwoodSkeletonCard()
            }
        }
    }
}
