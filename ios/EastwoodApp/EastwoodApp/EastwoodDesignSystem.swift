import SwiftUI

enum EastwoodLayout {
    static func pagePadding(for width: CGFloat) -> CGFloat {
        if width < 380 { return 10 }
        if width < 430 { return 12 }
        return 14
    }

    static func cardImageHeight(for width: CGFloat) -> CGFloat {
        min(max(width * 0.34, 120), 180)
    }

    static func heroImageHeight(for width: CGFloat) -> CGFloat {
        min(max(width * 0.44, 160), 240)
    }

    static func listThumbSize(for width: CGFloat) -> CGFloat {
        width < 390 ? 64 : 72
    }
}

enum EastwoodTheme {
    static let gold = Color(red: 0.33, green: 0.49, blue: 0.59)
    static let goldSoft = Color(red: 0.24, green: 0.36, blue: 0.45)
    static let ink = Color(red: 0.08, green: 0.09, blue: 0.12)
    static let panel = Color.white
    static let panelSoft = Color(red: 0.94, green: 0.95, blue: 0.97)
    static let hairline = Color.black.opacity(0.08)
    static let groupedTop = Color(red: 0.96, green: 0.96, blue: 0.97)
    static let groupedBottom = Color(red: 0.93, green: 0.94, blue: 0.96)
    static let searchFill = Color(red: 0.89, green: 0.90, blue: 0.92)
    static let mutedText = Color(red: 0.53, green: 0.55, blue: 0.60)
}

enum EastwoodMotion {
    static let pageEnter = Animation.easeOut(duration: 0.26)
    static let listUpdate = Animation.easeInOut(duration: 0.22)
    static let tabSwitch = Animation.spring(response: 0.32, dampingFraction: 0.88)
}

struct EastwoodBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [EastwoodTheme.groupedTop, EastwoodTheme.groupedBottom],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            RadialGradient(
                colors: [
                    EastwoodTheme.gold.opacity(0.04),
                    Color.clear,
                ],
                center: .topTrailing,
                startRadius: 10,
                endRadius: 380
            )
            .ignoresSafeArea()
        }
    }
}

struct EastwoodPanelModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                LinearGradient(
                    colors: [EastwoodTheme.panel, EastwoodTheme.panelSoft],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(EastwoodTheme.hairline, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.05), radius: 14, y: 6)
    }
}

struct EastwoodInputModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(12)
            .background(EastwoodTheme.searchFill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct EastwoodPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(colors: [EastwoodTheme.gold.opacity(0.9), EastwoodTheme.gold], startPoint: .topLeading, endPoint: .bottomTrailing),
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.99 : 1.0)
            .shadow(color: EastwoodTheme.gold.opacity(0.14), radius: 10, y: 4)
    }
}

struct EastwoodSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(EastwoodTheme.gold)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.white.opacity(configuration.isPressed ? 0.98 : 0.92), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(EastwoodTheme.hairline, lineWidth: 1)
            )
    }
}

extension View {
    func eastwoodPanel() -> some View { modifier(EastwoodPanelModifier()) }
    func eastwoodInput() -> some View { modifier(EastwoodInputModifier()) }
    func eastwoodEnterMotion(id: String) -> some View { modifier(EastwoodEnterMotion(id: id)) }
    func eastwoodScreen() -> some View { modifier(EastwoodScreenModifier()) }
    func eastwoodFillScreen(alignment: Alignment = .top) -> some View {
        frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment)
    }
}

struct EastwoodScreenModifier: ViewModifier {
    func body(content: Content) -> some View {
        ZStack(alignment: .top) {
            EastwoodBackground()
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
}

struct EastwoodEnterMotion: ViewModifier {
    let id: String
    @State private var visible = true

    func body(content: Content) -> some View {
        content
            .onAppear {
                visible = true
            }
            .id(id)
    }
}

struct EastwoodShimmer: View {
    @State private var phase: CGFloat = -0.8
    var body: some View {
        LinearGradient(
            colors: [
                Color.white.opacity(0.02),
                Color.white.opacity(0.18),
                Color.white.opacity(0.02),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .rotationEffect(.degrees(12))
        .offset(x: phase * 320)
        .onAppear {
            withAnimation(.linear(duration: 1.1).repeatForever(autoreverses: false)) {
                phase = 0.9
            }
        }
    }
}

struct EastwoodSkeletonCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(EastwoodTheme.panelSoft)
                .frame(height: 120)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 14)))

            RoundedRectangle(cornerRadius: 6)
                .fill(EastwoodTheme.panelSoft)
                .frame(height: 16)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 6)))

            RoundedRectangle(cornerRadius: 6)
                .fill(EastwoodTheme.panelSoft.opacity(0.88))
                .frame(width: 140, height: 12)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 6)))
        }
        .padding(12)
        .eastwoodPanel()
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
