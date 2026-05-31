import SwiftUI
import UIKit

private struct NativeAdminProfile: Decodable, Identifiable {
    let id: String
    let email: String?
    let first_name: String?
    let last_name: String?
    let user_id: String?
    let role: String
    let created_at: String
    let updated_at: String
}

private struct NativeAdminProfilesResponse: Decodable {
    let profiles: [NativeAdminProfile]
}

@MainActor
private final class NativeAdminUsersManager: ObservableObject {
    @Published var profiles: [NativeAdminProfile] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionMessage: String?

    func load(token: String) async {
        guard let api = NativeAPIClient() else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let data = try await api.requestJSON(path: "api/admin/profiles", token: token, retries: 1)
            let decoded = try JSONDecoder().decode(NativeAdminProfilesResponse.self, from: data)
            profiles = decoded.profiles
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            errorMessage = error.localizedDescription
        }
    }

    func updateRole(profileId: String, role: String, token: String) async -> Bool {
        guard let api = NativeAPIClient() else { return false }
        actionMessage = nil
        do {
            _ = try await api.requestJSON(
                path: "api/admin/profiles",
                method: "PATCH",
                token: token,
                body: ["id": profileId, "role": role],
                retries: 1
            )
            actionMessage = "Role updated"
            return true
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            actionMessage = error.localizedDescription
            return false
        }
    }

    func deleteProfile(profileId: String, token: String) async -> Bool {
        guard let api = NativeAPIClient() else { return false }
        actionMessage = nil
        do {
            _ = try await api.requestJSON(
                path: "api/admin/profiles",
                method: "DELETE",
                token: token,
                body: ["id": profileId],
                retries: 1
            )
            actionMessage = "User deleted"
            return true
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            actionMessage = error.localizedDescription
            return false
        }
    }
}

struct NativeAdminUsersView: View {
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var manager = NativeAdminUsersManager()
    @State private var deletingProfile: NativeAdminProfile?

    var body: some View {
        Group {
            if !auth.isAdmin {
                Text("Admin access required")
                    .foregroundStyle(.secondary)
            } else {
                List {
                    if let error = manager.errorMessage {
                        Section {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(error).foregroundStyle(.red)
                                Button("Retry") {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    Task { await manager.load(token: auth.accessToken) }
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                            }
                        }
                    }

                    if let action = manager.actionMessage, !action.isEmpty {
                        Section {
                            Text(action)
                                .font(.footnote)
                                .foregroundStyle(action.lowercased().contains("error") ? .red : .secondary)
                        }
                    }

                    Section("Administrators") {
                        let admins = manager.profiles.filter { $0.role == "admin" }
                        if admins.isEmpty && !manager.isLoading {
                            Text("No admin users").foregroundStyle(.secondary)
                        }
                        ForEach(admins) { profileRow($0) }
                    }

                    Section("Users") {
                        let users = manager.profiles.filter { $0.role == "user" }
                        if users.isEmpty && !manager.isLoading {
                            Text("No users").foregroundStyle(.secondary)
                        }
                        ForEach(users) { profileRow($0) }
                    }
                }
                .scrollContentBackground(.hidden)
                .background(EastwoodBackground())
                .overlay {
                    if manager.isLoading {
                        ProgressView()
                    }
                }
            }
        }
        .navigationTitle("Admin Users")
        .task {
            if auth.isAdmin {
                await manager.load(token: auth.accessToken)
            }
        }
        .refreshable {
            if auth.isAdmin {
                await manager.load(token: auth.accessToken)
            }
        }
        .alert("Delete user?", isPresented: Binding(get: { deletingProfile != nil }, set: { if !$0 { deletingProfile = nil } })) {
            Button("Cancel", role: .cancel) { deletingProfile = nil }
            Button("Delete", role: .destructive) {
                guard let profile = deletingProfile else { return }
                Task {
                    let ok = await manager.deleteProfile(profileId: profile.id, token: auth.accessToken)
                    if ok { await manager.load(token: auth.accessToken) }
                    deletingProfile = nil
                }
            }
        } message: {
            Text("This action cannot be undone.")
        }
    }

    @ViewBuilder
    private func profileRow(_ profile: NativeAdminProfile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(displayName(profile))
                .font(.headline)
            Text(profile.email ?? "No email")
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                Text(profile.role == "admin" ? "Admin" : "User")
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background((profile.role == "admin" ? Color.orange : Color.blue).opacity(0.2), in: Capsule())

                Spacer()

                Button(profile.role == "admin" ? "Set User" : "Set Admin") {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    Task {
                        let targetRole = profile.role == "admin" ? "user" : "admin"
                        let ok = await manager.updateRole(profileId: profile.id, role: targetRole, token: auth.accessToken)
                        if ok { await manager.load(token: auth.accessToken) }
                    }
                }
                .buttonStyle(EastwoodSecondaryButtonStyle())

                Button("Delete", role: .destructive) {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    deletingProfile = profile
                }
                .buttonStyle(EastwoodSecondaryButtonStyle())
            }
        }
        .padding(.vertical, 4)
    }

    private func displayName(_ profile: NativeAdminProfile) -> String {
        let first = profile.first_name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let last = profile.last_name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let full = "\(first) \(last)".trimmingCharacters(in: .whitespacesAndNewlines)
        if !full.isEmpty { return full }
        if let uid = profile.user_id, !uid.isEmpty { return uid }
        return "Unnamed user"
    }
}
