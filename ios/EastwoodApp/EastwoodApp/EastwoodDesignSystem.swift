import SwiftUI

enum EastwoodTheme {
    static let gold = Color(red: 0.86, green: 0.72, blue: 0.44)
    static let goldSoft = Color(red: 0.95, green: 0.84, blue: 0.62)
    static let ink = Color(red: 0.06, green: 0.07, blue: 0.09)
    static let panel = Color(red: 0.11, green: 0.12, blue: 0.15)
    static let panelSoft = Color(red: 0.15, green: 0.16, blue: 0.20)
    static let hairline = Color.white.opacity(0.12)
}

enum EastwoodMotion {
    static let pageEnter = Animation.easeOut(duration: 0.26)
    static let listUpdate = Animation.easeInOut(duration: 0.22)
    static let tabSwitch = Animation.spring(response: 0.32, dampingFraction: 0.88)
}

struct EastwoodBackground: View {
    var body: some View {
        LinearGradient(
            colors: [EastwoodTheme.ink, Color(red: 0.09, green: 0.10, blue: 0.13)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

struct EastwoodPanelModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                LinearGradient(
                    colors: [EastwoodTheme.panel.opacity(0.95), EastwoodTheme.panelSoft.opacity(0.95)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(EastwoodTheme.hairline, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.35), radius: 14, y: 6)
    }
}

struct EastwoodInputModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(12)
            .background(EastwoodTheme.panelSoft.opacity(0.85), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(EastwoodTheme.hairline, lineWidth: 1)
            )
    }
}

struct EastwoodPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .foregroundStyle(Color.black.opacity(0.88))
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(colors: [EastwoodTheme.goldSoft, EastwoodTheme.gold], startPoint: .topLeading, endPoint: .bottomTrailing),
                in: RoundedRectangle(cornerRadius: 12, style: .continuous)
            )
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.99 : 1.0)
            .shadow(color: EastwoodTheme.gold.opacity(0.22), radius: 12, y: 5)
    }
}

struct EastwoodSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(EastwoodTheme.goldSoft)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(EastwoodTheme.panelSoft.opacity(configuration.isPressed ? 0.9 : 0.75), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 11, style: .continuous)
                    .stroke(EastwoodTheme.gold.opacity(0.35), lineWidth: 1)
            )
    }
}

extension View {
    func eastwoodPanel() -> some View { modifier(EastwoodPanelModifier()) }
    func eastwoodInput() -> some View { modifier(EastwoodInputModifier()) }
    func eastwoodEnterMotion(id: String) -> some View { modifier(EastwoodEnterMotion(id: id)) }
}

struct EastwoodEnterMotion: ViewModifier {
    let id: String
    @State private var visible = false

    func body(content: Content) -> some View {
        content
            .opacity(visible ? 1 : 0.0)
            .offset(y: visible ? 0 : 8)
            .onAppear {
                withAnimation(EastwoodMotion.pageEnter) {
                    visible = true
                }
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
                .fill(EastwoodTheme.panelSoft.opacity(0.85))
                .frame(height: 200)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 14)))

            RoundedRectangle(cornerRadius: 6)
                .fill(EastwoodTheme.panelSoft.opacity(0.85))
                .frame(height: 16)
                .overlay(EastwoodShimmer().clipShape(RoundedRectangle(cornerRadius: 6)))

            RoundedRectangle(cornerRadius: 6)
                .fill(EastwoodTheme.panelSoft.opacity(0.75))
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
