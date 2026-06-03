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
            errorMessage = AppErrorPresenter.message(for: error)
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
            actionMessage = "role_updated"
            return true
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            actionMessage = AppErrorPresenter.message(for: error)
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
            actionMessage = "user_deleted"
            return true
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            actionMessage = AppErrorPresenter.message(for: error)
            return false
        }
    }
}

struct NativeAdminUsersView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var manager = NativeAdminUsersManager()
    @State private var deletingProfile: NativeAdminProfile?
    @State private var roleConfirmState: (id: String, nextRole: String)?

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        Group {
            if !auth.isAdmin {
                EastwoodStateView(
                    systemImage: "lock.shield",
                    title: language.text("admin.accessRequired"),
                    message: language.text("admin.users.subtitle")
                )
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(language.text("admin.users.header"))
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundStyle(EastwoodTheme.ink)
                            Text(language.text("admin.users.subtitle"))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .eastwoodPanel()

                        if let error = manager.errorMessage {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(error).foregroundStyle(.red)
                                Button(language.text("admin.retry")) {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    Task { await manager.load(token: auth.accessToken) }
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                            }
                            .padding(14)
                            .eastwoodPanel()
                        }

                        if let action = manager.actionMessage, !action.isEmpty {
                            Text(localizedActionMessage(action))
                                .font(.footnote)
                                .foregroundStyle(isErrorActionMessage(action) ? .red : .secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(12)
                                .eastwoodPanel()
                        }

                        adminSection(language.text("admin.users.admins"), items: manager.profiles.filter { $0.role == "admin" })
                        adminSection(language.text("admin.users.users"), items: manager.profiles.filter { $0.role == "user" })
                    }
                    .padding(.horizontal, pad)
                    .padding(.vertical, 12)
                }
            }
        }
        .overlay {
            if auth.isAdmin && manager.isLoading {
                EastwoodSkeletonList(count: 3)
                    .padding(.horizontal, pad)
            }
        }
        .navigationTitle(language.text("admin.users.title"))
        .background(EastwoodBackground())
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
        .alert(language.text("admin.users.deleteTitle"), isPresented: Binding(get: { deletingProfile != nil }, set: { if !$0 { deletingProfile = nil } })) {
            Button(language.text("common.cancel"), role: .cancel) { deletingProfile = nil }
            Button(language.text("admin.users.delete"), role: .destructive) {
                guard let profile = deletingProfile else { return }
                Task {
                    let ok = await manager.deleteProfile(profileId: profile.id, token: auth.accessToken)
                    if ok { await manager.load(token: auth.accessToken) }
                    deletingProfile = nil
                }
            }
        } message: {
            Text(language.text("admin.delete.message"))
        }
    }

    @ViewBuilder
    private func adminSection(_ title: String, items: [NativeAdminProfile]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundStyle(EastwoodTheme.ink)

            if items.isEmpty && !manager.isLoading {
                Text(title == language.text("admin.users.users") ? language.text("admin.users.none") : language.text("admin.users.noneAdmins"))
                    .foregroundStyle(.secondary)
            }

            ForEach(items) { profile in
                profileRow(profile)
                if profile.id != items.last?.id {
                    Divider().overlay(EastwoodTheme.hairline)
                }
            }
        }
        .padding(14)
        .eastwoodPanel()
    }

    @ViewBuilder
    private func profileRow(_ profile: NativeAdminProfile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(displayName(profile))
                .font(.headline)

            Text(profile.email ?? language.text("admin.users.noEmail"))
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                Text(profile.role == "admin" ? language.text("admin.users.admin") : language.text("admin.users.user"))
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background((profile.role == "admin" ? Color.orange : Color.blue).opacity(0.2), in: Capsule())

                Spacer()

                Button(profile.role == "admin" ? language.text("admin.users.setUser") : language.text("admin.users.setAdmin")) {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    let targetRole = profile.role == "admin" ? "user" : "admin"
                    if roleConfirmState?.id != profile.id || roleConfirmState?.nextRole != targetRole {
                        roleConfirmState = (profile.id, targetRole)
                        return
                    }
                    Task {
                        let ok = await manager.updateRole(profileId: profile.id, role: targetRole, token: auth.accessToken)
                        if ok { await manager.load(token: auth.accessToken) }
                        roleConfirmState = nil
                    }
                }
                .buttonStyle(EastwoodSecondaryButtonStyle())
                .overlay(alignment: .bottom) {
                    if roleConfirmState?.id == profile.id {
                        Text(language.text("admin.users.confirmTap"))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .offset(y: 16)
                    }
                }

                Button(language.text("admin.users.delete"), role: .destructive) {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    roleConfirmState = nil
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
        return language.text("admin.users.unnamed")
    }

    private func localizedActionMessage(_ action: String) -> String {
        switch action {
        case "role_updated":
            return language.text("admin.roleUpdated")
        case "user_deleted":
            return language.text("admin.deleteUserResult")
        default:
            return action
        }
    }

    private func isErrorActionMessage(_ action: String) -> Bool {
        action != "role_updated" && action != "user_deleted"
    }
}
