import SwiftUI

struct EastwoodStateView: View {
    let systemImage: String
    let title: String
    let message: String
    var buttonTitle: String? = nil
    var onTap: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: systemImage)
                .font(.title.weight(.medium))
                .foregroundStyle(EastwoodTheme.gold)
                .frame(width: 56, height: 56)
                .background(
                    EastwoodTheme.gold.opacity(0.08),
                    in: Circle()
                )

            Text(title)
                .font(.headline)
                .foregroundStyle(EastwoodTheme.ink)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 4)

            if let buttonTitle, let onTap {
                Button(buttonTitle, action: onTap)
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                    .padding(.top, 4)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .eastwoodPanel()
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }
}
