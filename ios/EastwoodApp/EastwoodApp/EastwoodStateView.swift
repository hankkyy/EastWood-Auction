import SwiftUI

struct EastwoodStateView: View {
    let systemImage: String
    let title: String
    let message: String
    var buttonTitle: String? = nil
    var onTap: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.title2.weight(.semibold))
                .foregroundStyle(EastwoodTheme.goldSoft)
                .padding(10)
                .background(EastwoodTheme.panelSoft.opacity(0.85), in: Circle())

            Text(title)
                .font(.headline)

            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if let buttonTitle, let onTap {
                Button(buttonTitle, action: onTap)
                    .buttonStyle(EastwoodSecondaryButtonStyle())
                    .padding(.top, 2)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .eastwoodPanel()
        .padding(.horizontal, 16)
        .padding(.top, 16)
        .eastwoodFillScreen(alignment: .top)
    }
}
