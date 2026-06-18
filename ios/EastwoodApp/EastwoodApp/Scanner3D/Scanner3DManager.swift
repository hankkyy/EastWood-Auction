import Foundation
import ARKit
import RealityKit
import SwiftUI

// MARK: - 3D Scanner Manager

/// Manages 3D scanning via Photogrammetry (iOS 17+) or ARKit LiDAR mesh (iOS 16).
@MainActor
final class Scanner3DManager: ObservableObject {

    enum ScanState: Equatable {
        case ready
        case capturing(imageCount: Int, minRequired: Int)
        case processing(progress: Double)
        case completed(modelURL: URL, thumbnail: UIImage)
        case failed(String)
    }

    enum ScannerMode {
        /// iOS 17+: Object Capture via PhotogrammetrySession — best quality
        case photogrammetry
        /// iOS 16: ARKit scene reconstruction — basic mesh
        case lidarMesh
        case notSupported
    }

    @Published var state: ScanState = .ready
    @Published var latestThumbnail: UIImage?

    // MARK: - Captured images for photogrammetry

    private var capturedImages: [CGImage] = []

    /// Minimum number of photos required for a decent scan.
    /// PhotogrammetrySession works best with 30-200 images.
    let minRequiredImages = 30
    let maxImages = 200

    // MARK: - Output directory

    private var outputDir: URL {
        FileManager.default.temporaryDirectory
            .appendingPathComponent("eastwood_scan_\(UUID().uuidString.prefix(8))")
    }

    // MARK: - Mode detection

    static var supportedMode: ScannerMode {
        if #available(iOS 17.0, *), ObjectCaptureSession.isSupported {
            return .photogrammetry
        }
        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            return .lidarMesh
        }
        return .notSupported
    }

    static var isSupported: Bool {
        supportedMode != .notSupported
    }

    // MARK: - Photogrammetry (iOS 17+ Object Capture)

    /// Add a captured frame to the image set for photogrammetry processing.
    func addPhotogrammetryFrame(_ image: CGImage) {
        guard case .ready = state else { return }
        guard capturedImages.count < maxImages else { return }

        capturedImages.append(image)

        if capturedImages.count == 1 {
            // Generate thumbnail from first frame
            let uiImage = UIImage(cgImage: image)
            latestThumbnail = uiImage
            state = .capturing(imageCount: 1, minRequired: minRequiredImages)
        } else if case .capturing(_, let minReq) = state {
            state = .capturing(imageCount: capturedImages.count, minRequired: minReq)
        }
    }

    /// Begin photogrammetry processing with the accumulated images.
    @available(iOS 17.0, *)
    func startPhotogrammetryProcessing() async {
        guard capturedImages.count >= minRequiredImages else {
            state = .failed("Need at least \(minRequiredImages) images. You have \(capturedImages.count).")
            return
        }

        let dir = outputDir
        let imagesDir = dir.appendingPathComponent("Images")
        do {
            try FileManager.default.createDirectory(at: imagesDir, withIntermediateDirectories: true)

            // Write images to disk
            for (index, cgImage) in capturedImages.enumerated() {
                let imagePath = imagesDir.appendingPathComponent("frame_\(String(format: "%04d", index)).jpg")
                let uiImage = UIImage(cgImage: cgImage)
                guard let data = uiImage.jpegData(compressionQuality: 0.9) else {
                    state = .failed("Failed to encode image \(index)")
                    return
                }
                try data.write(to: imagePath)
            }
        } catch {
            state = .failed("Failed to prepare images: \(error.localizedDescription)")
            return
        }

        state = .processing(progress: 0)

        let modelURL = dir.appendingPathComponent("model.usdz")

        do {
            var request = PhotogrammetrySession.Request.modelFile(url: modelURL)
            // Reduced quality to keep output under 50 MB (Supabase Free plan cap)
            // Switch to .normal or .high if you upgrade to Pro ($25/mo, 5 GB limit)
            request.featureSensitivity = .reduced
            request.isObjectMaskingEnabled = true

            let config = PhotogrammetrySession.Configuration()
            let session = try PhotogrammetrySession(input: imagesDir, configuration: config)
            self.latestThumbnail = nil

            for try await output in session.outputs {
                switch output {
                case .requestProgress(let req, let fraction):
                    if case .modelFile = req {
                        self.state = .processing(progress: fraction)
                    }
                case .requestProgressInfo(let req, let info):
                    if case .modelFile = req {
                        // info contains more detail like estimated time remaining
                        self.state = .processing(progress: self.progressValue)
                    }
                case .requestComplete(let req, let result):
                    if case .modelFile = req {
                        switch result {
                        case .modelFile(let url):
                            // Generate thumbnail from the first captured image
                            let thumbnail = self.capturedImages.first.map { UIImage(cgImage: $0) }
                                ?? UIImage(systemName: "view.3d")!
                            self.state = .completed(modelURL: url, thumbnail: thumbnail)
                            self.capturedImages.removeAll()
                        case .failed(let error):
                            self.state = .failed("Photogrammetry failed: \(error.localizedDescription)")
                        }
                    }
                case .processingComplete:
                    break
                case .inputComplete:
                    break
                case .invalidSample(_, _):
                    break
                case .skippedSample(_):
                    break
                case .automaticDownsampling:
                    break
                case .stitchingIncomplete:
                    self.state = .failed("Photogrammetry incomplete — try more images with better coverage.")
                @unknown default:
                    break
                }
            }
        } catch {
            state = .failed("Photogrammetry error: \(error.localizedDescription)")
        }
    }

    // MARK: - Helpers

    private var progressValue: Double {
        if case .processing(let p) = state { return p }
        return 0
    }

    /// Reset the scanner state for a new scan.
    func reset() {
        capturedImages.removeAll()
        latestThumbnail = nil
        state = .ready
    }

    // MARK: - Scanning guidance

    /// Suggested number of images per pass: top, middle, bottom
    static let guidanceTips: [String] = [
        "Rotate slowly around the item",
        "Keep the item centered in the frame",
        "Capture from 3 heights: top-down, eye-level, low-angle",
        "Avoid reflective surfaces and harsh shadows",
        "Use even, diffused lighting for best results",
        "Minimum \(minRequiredImages) photos recommended for a good model"
    ]

    nonisolated static var minRequiredImages: Int { 30 }
}
