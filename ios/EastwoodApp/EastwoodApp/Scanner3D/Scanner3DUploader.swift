import Foundation
import UIKit

// MARK: - 3D Scanner Uploader

/// Uploads USDZ 3D model + thumbnail to Supabase Storage via the Eastwood API.
struct Scanner3DUploader {

    enum UploadError: LocalizedError {
        case noAPIClient
        case fileTooLarge(Int64)
        case uploadFailed(String)
        case serverError(String)

        var errorDescription: String? {
            switch self {
            case .noAPIClient:
                return "API client unavailable"
            case .fileTooLarge(let size):
                return "File too large: \(ByteCountFormatter.string(fromByteCount: size, countStyle: .file))"
            case .uploadFailed(let msg):
                return "Upload failed: \(msg)"
            case .serverError(let msg):
                return msg
            }
        }
    }

    /// Maximum file size: 50 MB (Supabase Free plan hard cap)
    static let maxFileSize: Int64 = 50 * 1024 * 1024

    /// Upload a USDZ model + thumbnail image to a specific artwork
    static func uploadModel(
        modelURL: URL,
        thumbnail: UIImage,
        artworkId: String,
        token: String
    ) async throws -> Native3DModel {

        // Validate file size
        let fileSize = (try? modelURL.resourceValues(forKeys: [.fileSizeKey]).fileSize.map(Int64.init)) ?? 0
        guard fileSize <= maxFileSize else {
            throw UploadError.fileTooLarge(fileSize)
        }

        guard let api = NativeAPIClient() else {
            throw UploadError.noAPIClient
        }

        let modelData = try Data(contentsOf: modelURL)
        let thumbnailData = thumbnail.jpegData(compressionQuality: 0.85)
            ?? thumbnail.pngData()!

        // Build multipart form data
        let boundary = "Boundary-\(UUID().uuidString)"
        var body = Data()

        func appendPart(name: String, fileName: String, mimeType: String, data: Data) {
            var part = Data()
            part.append("--\(boundary)\r\n".data(using: .utf8)!)
            part.append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
            part.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
            part.append(data)
            part.append("\r\n".data(using: .utf8)!)
            body.append(part)
        }

        appendPart(name: "model", fileName: "model.usdz", mimeType: "model/vnd.usdz+zip", data: modelData)
        appendPart(name: "thumbnail", fileName: "thumbnail.jpg", mimeType: "image/jpeg", data: thumbnailData)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        // Build request
        let path = "api/artworks/\(artworkId)/3d-model"
        guard let url = URL(string: "\(api.baseURL.absoluteString)\(path)") else {
            throw UploadError.uploadFailed("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = body
        request.timeoutInterval = 120 // 2 min timeout for large uploads

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw UploadError.uploadFailed("No HTTP response")
        }

        if http.statusCode == 401 || http.statusCode == 403 {
            throw UploadError.serverError("Authentication failed")
        }

        guard (200...299).contains(http.statusCode) else {
            if let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let msg = payload["error"] as? String {
                throw UploadError.serverError(msg)
            }
            throw UploadError.serverError("Server returned \(http.statusCode)")
        }

        // Parse response → Native3DModel
        let decoder = JSONDecoder()
        struct Response: Decodable {
            let threeDModel: Native3DModel
            enum CodingKeys: String, CodingKey {
                case threeDModel = "three_d_model"
            }
        }

        let result = try decoder.decode(Response.self, from: data)
        return result.threeDModel
    }

    /// Shortcut: scan → insert into Supabase → update artwork
    /// Used when uploading during artwork creation flow
    static func uploadForNewArtwork(
        modelURL: URL,
        thumbnail: UIImage,
        token: String
    ) async throws -> Native3DModel {
        // For new artwork upload during creation, use a temporary ID
        // The server will generate and return the final model info
        guard let api = NativeAPIClient() else {
            throw UploadError.noAPIClient
        }

        let modelData = try Data(contentsOf: modelURL)
        let thumbnailData = thumbnail.jpegData(compressionQuality: 0.85)!

        let boundary = "Boundary-\(UUID().uuidString)"
        var body = Data()

        func appendPart(name: String, fileName: String, mimeType: String, data: Data) {
            var part = Data()
            part.append("--\(boundary)\r\n".data(using: .utf8)!)
            part.append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
            part.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
            part.append(data)
            part.append("\r\n".data(using: .utf8)!)
            body.append(part)
        }

        appendPart(name: "model", fileName: "model.usdz", mimeType: "model/vnd.usdz+zip", data: modelData)
        appendPart(name: "thumbnail", fileName: "thumbnail.jpg", mimeType: "image/jpeg", data: thumbnailData)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        let path = "api/artworks/3d-upload"
        guard let url = URL(string: "\(api.baseURL.absoluteString)\(path)") else {
            throw UploadError.uploadFailed("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = body
        request.timeoutInterval = 120

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw UploadError.uploadFailed("Upload failed")
        }

        let decoder = JSONDecoder()
        struct Response: Decodable {
            let threeDModel: Native3DModel
            enum CodingKeys: String, CodingKey {
                case threeDModel = "three_d_model"
            }
        }

        return try decoder.decode(Response.self, from: data).threeDModel
    }
}
