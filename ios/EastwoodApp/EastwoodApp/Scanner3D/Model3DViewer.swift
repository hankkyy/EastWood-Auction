import SwiftUI
import RealityKit

// MARK: - 3D Model Viewer (iOS 17+ RealityKit, iOS 16 SceneKit fallback)

/// Full-screen 3D model viewer with gesture controls.
/// Supports USDZ and GLB formats via RealityKit Model3D (iOS 17+) or SceneKit (iOS 16).
struct Model3DViewer: View {
    let modelURL: URL
    let thumbnailURL: URL?

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var language: LanguageManager
    @State private var showControls = true
    @State private var isLoading = true
    @State private var loadError: String?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // 3D Model
            if #available(iOS 17.0, *) {
                RealityKitModelView(url: modelURL, isLoading: $isLoading, loadError: $loadError)
            } else {
                SceneKitModelView(url: modelURL, isLoading: $isLoading, loadError: $loadError)
            }

            // Loading overlay
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(.white)
                    Text(language.language == .chinese ? "加载 3D 模型..." : "Loading 3D model...")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
            }

            // Error overlay
            if let error = loadError {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 40))
                        .foregroundColor(.orange)
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    Button(language.language == .chinese ? "关闭" : "Dismiss") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial, in: Capsule())
                }
            }

            // Controls overlay
            if showControls && !isLoading {
                controlsOverlay
            }
        }
        .statusBarHidden()
        .preferredColorScheme(.dark)
        .onTapGesture {
            withAnimation(.easeInOut(duration: 0.2)) {
                showControls.toggle()
            }
        }
    }

    // MARK: - Controls

    private var controlsOverlay: some View {
        VStack {
            // Top bar
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.white.opacity(0.9))
                }

                Spacer()

                Text(language.language == .chinese ? "3D 预览" : "3D Preview")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.white.opacity(0.9))

                Spacer()

                // QuickLook AR button (iOS only)
                Button {
                    presentQuickLook()
                } label: {
                    Image(systemName: "arkit")
                        .font(.title2)
                        .foregroundColor(.white.opacity(0.9))
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .background(
                LinearGradient(
                    colors: [Color.black.opacity(0.6), Color.clear],
                    startPoint: .top, endPoint: .bottom
                )
            )

            Spacer()

            // Bottom hint
            VStack(spacing: 6) {
                Text(language.language == .chinese
                     ? "单指旋转 · 双指缩放 · 双指平移"
                     : "Drag to rotate · Pinch to zoom · Two-finger pan")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))

                Text(language.language == .chinese
                     ? "轻点屏幕切换控制面板"
                     : "Tap screen to toggle controls")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.5))
            }
            .padding(.bottom, 30)
            .background(
                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.6)],
                    startPoint: .top, endPoint: .bottom
                )
            )
        }
    }

    private func presentQuickLook() {
        // QuickLook AR preview (opens system AR viewer)
        let activityVC = UIActivityViewController(
            activityItems: [modelURL],
            applicationActivities: nil
        )

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }
}

// MARK: - RealityKit Model (iOS 17+)

@available(iOS 17.0, *)
private struct RealityKitModelView: View {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var loadError: String?

    var body: some View {
        RealityView { content in
            do {
                let entity = try await ModelEntity(contentsOf: url)

                // Configure entity
                entity.components.set(InputTargetComponent())
                entity.generateCollisionShapes(recursive: true)

                // Add to scene
                content.add(entity)

                await MainActor.run {
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    loadError = error.localizedDescription
                }
            }
        } update: { content in
            // Scene updates
        }
        .installGestures()
    }
}

// MARK: - SceneKit Model (iOS 16+ fallback)

private struct SceneKitModelView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var loadError: String?

    func makeUIView(context: Context) -> SCNView {
        let sceneView = SCNView()
        sceneView.backgroundColor = .black
        sceneView.allowsCameraControl = true
        sceneView.autoenablesDefaultLighting = true
        sceneView.antialiasingMode = .multisampling4X

        // Load model
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let scene = try SCNScene(url: url, options: [
                    .checkConsistency: true,
                    .flattenFBX: false,
                ])

                DispatchQueue.main.async {
                    sceneView.scene = scene
                    isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    isLoading = false
                    loadError = error.localizedDescription
                }
            }
        }

        return sceneView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}
}

// MARK: - Preview

#Preview {
    Model3DViewer(
        modelURL: URL(string: "https://example.com/model.usdz")!,
        thumbnailURL: nil
    )
    .environmentObject(LanguageManager())
}
