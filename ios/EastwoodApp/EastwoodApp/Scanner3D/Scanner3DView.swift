import SwiftUI
import UIKit
import AVFoundation

// MARK: - 3D Scanner View (Xiaohongshu / App Store minimal aesthetic)

struct Scanner3DView: View {
    @StateObject private var manager = Scanner3DManager()
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var language: LanguageManager

    let onComplete: (URL, UIImage) -> Void

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Camera preview — always on during ready/capturing
            if manager.state == .ready || manager.state == .capturing(0, 0) {
                CameraCaptureView { image in
                    manager.addPhotogrammetryFrame(image)
                }
                .ignoresSafeArea()
            }

            // State-driven overlays
            switch manager.state {
            case .ready:
                ReadyState()
            case .capturing(let count, let min):
                CapturingState(count: count, minRequired: min,
                               onGenerate: { await generateIfAvailable() })
            case .processing(let progress):
                ProcessingState(progress: progress)
            case .completed(let url, let thumbnail):
                CompletedState(thumbnail: thumbnail,
                               onUse: { onComplete(url, thumbnail); dismiss() })
            case .failed(let message):
                FailedState(message: message,
                            onRetry: { manager.reset() },
                            onDismiss: { dismiss() })
            }
        }
        .navigationBarHidden(true)
        .statusBarHidden()
    }

    @available(iOS 17.0, *)
    private func generateIfAvailable() async {
        await manager.startPhotogrammetryProcessing()
    }
}

// MARK: - Ready State

private struct ReadyState: View {
    @EnvironmentObject private var language: LanguageManager

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Single icon, thin weight — App Store style
            Image(systemName: "view.3d")
                .font(.system(size: 42, weight: .thin))
                .foregroundColor(.white)

            Text(language.language == .chinese ? "开始扫描" : "Start Scan")
                .font(.system(size: 26, weight: .semibold, design: .serif))
                .foregroundColor(.white)

            // One line of guidance — not a list
            Text(language.language == .chinese
                 ? "缓慢环绕物品一周"
                 : "Circle slowly around the item")
                .font(.system(size: 15, weight: .regular))
                .foregroundColor(.white.opacity(0.55))

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Capturing State

private struct CapturingState: View {
    let count: Int
    let minRequired: Int
    let onGenerate: () async -> Void

    @EnvironmentObject private var language: LanguageManager
    @State private var canGenerate = false

    private var fraction: CGFloat {
        min(CGFloat(count) / CGFloat(minRequired), 1.0)
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Minimal ring + count
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.2), lineWidth: 1.5)
                    .frame(width: 88, height: 88)

                Circle()
                    .trim(from: 0, to: fraction)
                    .stroke(.white, style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
                    .frame(width: 88, height: 88)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.4), value: count)

                Text("\(count)")
                    .font(.system(size: 28, weight: .medium, design: .serif))
                    .foregroundColor(.white)
            }

            // Subtle hint
            Text(hintText)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.45))
                .padding(.top, 28)

            Spacer()

            // Bottom: generate button only when ready
            if fraction >= 1.0 {
                Button {
                    Task { await onGenerate() }
                } label: {
                    Text(language.language == .chinese ? "生成" : "Generate")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.black)
                }
                .buttonStyle(ScannerPillButton())
                .padding(.bottom, 60)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            } else {
                // Empty space to keep layout stable
                Color.clear.frame(height: 60 + 44)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var hintText: String {
        let remaining = minRequired - count
        if remaining <= 0 {
            return language.language == .chinese ? "可以了" : "Enough"
        }
        return language.language == .chinese
            ? "还差 \(remaining) 张"
            : "\(remaining) more"
    }
}

// MARK: - Processing State

private struct ProcessingState: View {
    let progress: Double

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // A single animated ring — nothing else
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
                    .frame(width: 100, height: 100)

                Circle()
                    .trim(from: 0, to: max(progress, 0.03))
                    .stroke(.white, style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
                    .frame(width: 100, height: 100)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.5), value: progress)

                Text("\(Int(progress * 100))")
                    .font(.system(size: 24, weight: .light, design: .serif))
                    .foregroundColor(.white.opacity(0.6))
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
        .transition(.opacity)
    }
}

// MARK: - Completed State

private struct CompletedState: View {
    let thumbnail: UIImage
    let onUse: () -> Void
    @EnvironmentObject private var language: LanguageManager

    var body: some View {
        VStack(spacing: 28) {
            Spacer()

            Image(uiImage: thumbnail)
                .resizable()
                .scaledToFit()
                .frame(width: 180, height: 180)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            Text(language.language == .chinese ? "扫描完成" : "Done")
                .font(.system(size: 20, weight: .medium, design: .serif))
                .foregroundColor(.white)

            Spacer()

            Button {
                onUse()
            } label: {
                Text(language.language == .chinese ? "使用" : "Use")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.black)
            }
            .buttonStyle(ScannerPillButton())
            .padding(.bottom, 60)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
        .transition(.opacity)
    }
}

// MARK: - Failed State

private struct FailedState: View {
    let message: String
    let onRetry: () -> Void
    let onDismiss: () -> Void
    @EnvironmentObject private var language: LanguageManager

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Text(message)
                .font(.system(size: 15))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 48)

            Spacer()

            HStack(spacing: 20) {
                Button {
                    onDismiss()
                } label: {
                    Text(language.language == .chinese ? "取消" : "Cancel")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.7))
                }

                Button {
                    onRetry()
                } label: {
                    Text(language.language == .chinese ? "重试" : "Retry")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.black)
                }
                .buttonStyle(ScannerPillButton())
            }
            .padding(.bottom, 60)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
        .transition(.opacity)
    }
}

// MARK: - Pill Button Style

private struct ScannerPillButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 38)
            .padding(.vertical, 13)
            .background(.white, in: Capsule(style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Camera Capture View

private struct CameraCaptureView: UIViewRepresentable {
    let onFrameCaptured: (CGImage) -> Void

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black
        context.coordinator.setupCaptureSession(on: view)
        context.coordinator.onFrameCaptured = onFrameCaptured
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
        var onFrameCaptured: ((CGImage) -> Void)?
        private let session = AVCaptureSession()
        private let queue = DispatchQueue(label: "com.eastwood.scanner3d.camera")
        private var lastCapture: Date = .distantPast
        private let interval: TimeInterval = 0.25

        func setupCaptureSession(on view: UIView) {
            session.sessionPreset = .photo
            guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                  let input = try? AVCaptureDeviceInput(device: device) else { return }

            let output = AVCaptureVideoDataOutput()
            output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
            output.setSampleBufferDelegate(self, queue: queue)

            session.beginConfiguration()
            if session.canAddInput(input) { session.addInput(input) }
            if session.canAddOutput(output) { session.addOutput(output) }
            session.commitConfiguration()

            let preview = AVCaptureVideoPreviewLayer(session: session)
            preview.videoGravity = .resizeAspectFill
            preview.frame = UIScreen.main.bounds
            view.layer.addSublayer(preview)

            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.session.startRunning()
            }
        }

        func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer,
                           from connection: AVCaptureConnection) {
            let now = Date()
            guard now.timeIntervalSince(lastCapture) >= interval else { return }
            lastCapture = now
            guard let pixel = CMSampleBufferGetImageBuffer(sampleBuffer),
                  let ci = CIContext().createCGImage(CIImage(cvPixelBuffer: pixel), from: CIImage(cvPixelBuffer: pixel).extent)
            else { return }
            DispatchQueue.main.async { [weak self] in self?.onFrameCaptured?(ci) }
        }
    }
}

// MARK: - Equatable conformance needed for state matching

extension Scanner3DManager.ScanState: Equatable {
    static func == (lhs: Scanner3DManager.ScanState, rhs: Scanner3DManager.ScanState) -> Bool {
        switch (lhs, rhs) {
        case (.ready, .ready), (.processing, .processing): return true
        case (.capturing(let a, let b), .capturing(let c, let d)): return a == c && b == d
        case (.completed(let a, _), .completed(let b, _)): return a == b
        case (.failed(let a), .failed(let b)): return a == b
        default: return false
        }
    }
}

// MARK: - Preview

#Preview {
    Scanner3DView { _, _ in }
        .environmentObject(LanguageManager())
}
