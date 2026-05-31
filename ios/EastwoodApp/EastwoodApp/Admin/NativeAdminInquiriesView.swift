import SwiftUI
import UIKit

private enum AdminInquiryFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case pending = "Pending"
    case processed = "Processed"
    case archived = "Archived"

    var id: String { rawValue }
}

struct NativeAdminInquiriesView: View {
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var manager = NativeInquiryManager()

    @State private var filter: AdminInquiryFilter = .pending
    @State private var selected: NativeInquiry?
    @State private var selectionMode = false
    @State private var selectedIds: Set<String> = []

    private var filtered: [NativeInquiry] {
        switch filter {
        case .all:
            return manager.inquiries
        case .pending:
            return manager.inquiries.filter { !$0.is_processed && !$0.is_archived }
        case .processed:
            return manager.inquiries.filter { $0.is_processed && !$0.is_archived }
        case .archived:
            return manager.inquiries.filter { $0.is_archived }
        }
    }

    var body: some View {
        Group {
            if !auth.isAdmin {
                VStack(spacing: 8) {
                    Text("Admin access required")
                        .font(.headline)
                    Text("Only administrator accounts can access inquiry management.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding()
            } else {
                List {
                    Section {
                        Picker("Filter", selection: $filter) {
                            ForEach(AdminInquiryFilter.allCases) { item in
                                Text(item.rawValue).tag(item)
                            }
                        }
                        .pickerStyle(.segmented)
                    }

                    if manager.isLoading {
                        ProgressView()
                    }

                    if let err = manager.errorMessage {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(err).foregroundStyle(.red)
                            Button("Retry") {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                Task { await manager.load(token: auth.accessToken) }
                            }
                            .buttonStyle(EastwoodSecondaryButtonStyle())
                        }
                    }

                    if !manager.isLoading && manager.errorMessage == nil && filtered.isEmpty {
                        Text("No inquiries in this state")
                            .foregroundStyle(.secondary)
                    }

                    ForEach(filtered) { inquiry in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                if selectionMode {
                                    Image(systemName: selectedIds.contains(inquiry.id) ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(selectedIds.contains(inquiry.id) ? .green : .secondary)
                                }
                                Text(inquiry.no_inquiry_code ? "No Code" : (inquiry.inquiry_code ?? "Inquiry"))
                                    .font(.headline)
                                Spacer()
                                statusChip(inquiry)
                            }

                            Text(inquiry.details)
                                .font(.subheadline)
                                .lineLimit(2)
                                .foregroundStyle(.secondary)

                            HStack(spacing: 8) {
                                Button("View") {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    selected = inquiry
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())

                                if !inquiry.is_processed && !inquiry.is_archived {
                                    Button("Process") {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        Task {
                                            let ok = await manager.updateInquiryStatus(
                                                token: auth.accessToken,
                                                inquiryId: inquiry.id,
                                                isProcessed: true,
                                                isArchived: false
                                            )
                                            if ok { await manager.load(token: auth.accessToken) }
                                        }
                                    }
                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                }

                                if !inquiry.is_archived {
                                    Button("Archive") {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        Task {
                                            let ok = await manager.updateInquiryStatus(
                                                token: auth.accessToken,
                                                inquiryId: inquiry.id,
                                                isArchived: true
                                            )
                                            if ok { await manager.load(token: auth.accessToken) }
                                        }
                                    }
                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                } else {
                                    Button("Restore") {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        Task {
                                            let ok = await manager.updateInquiryStatus(
                                                token: auth.accessToken,
                                                inquiryId: inquiry.id,
                                                isArchived: false
                                            )
                                            if ok { await manager.load(token: auth.accessToken) }
                                        }
                                    }
                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                }
                            }
                            .font(.caption)
                        }
                        .padding(.vertical, 4)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            guard selectionMode else { return }
                            if selectedIds.contains(inquiry.id) {
                                selectedIds.remove(inquiry.id)
                            } else {
                                selectedIds.insert(inquiry.id)
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .background(EastwoodBackground())
            }
        }
        .navigationTitle("Admin Inquiries")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                if auth.isAdmin {
                    Button(selectionMode ? "Done" : "Select") {
                        selectionMode.toggle()
                        if !selectionMode { selectedIds.removeAll() }
                    }
                    .disabled(filtered.isEmpty)
                }
            }
            ToolbarItem(placement: .bottomBar) {
                if auth.isAdmin && selectionMode {
                    HStack(spacing: 10) {
                        Button("Process Selected") {
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            Task {
                                let ids = selectedIds
                                for id in ids {
                                    _ = await manager.updateInquiryStatus(
                                        token: auth.accessToken,
                                        inquiryId: id,
                                        isProcessed: true,
                                        isArchived: false
                                    )
                                }
                                selectedIds.removeAll()
                                await manager.load(token: auth.accessToken)
                            }
                        }
                        .buttonStyle(EastwoodSecondaryButtonStyle())
                        .disabled(selectedIds.isEmpty)

                        Button("Archive Selected") {
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            Task {
                                let ids = selectedIds
                                for id in ids {
                                    _ = await manager.updateInquiryStatus(
                                        token: auth.accessToken,
                                        inquiryId: id,
                                        isArchived: true
                                    )
                                }
                                selectedIds.removeAll()
                                await manager.load(token: auth.accessToken)
                            }
                        }
                        .buttonStyle(EastwoodSecondaryButtonStyle())
                        .disabled(selectedIds.isEmpty)

                        Button("Restore Selected") {
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            Task {
                                let ids = selectedIds
                                for id in ids {
                                    _ = await manager.updateInquiryStatus(
                                        token: auth.accessToken,
                                        inquiryId: id,
                                        isArchived: false
                                    )
                                }
                                selectedIds.removeAll()
                                await manager.load(token: auth.accessToken)
                            }
                        }
                        .buttonStyle(EastwoodSecondaryButtonStyle())
                        .disabled(selectedIds.isEmpty)
                    }
                }
            }
        }
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
        .sheet(item: $selected) { inquiry in
            NativeAdminInquiryDetailSheet(inquiry: inquiry)
        }
    }

    private func statusChip(_ inquiry: NativeInquiry) -> some View {
        let tuple: (String, Color) = {
            if inquiry.is_archived { return ("Archived", .gray) }
            if inquiry.is_processed { return ("Processed", .green) }
            return ("Pending", .orange)
        }()

        return Text(tuple.0)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(tuple.1.opacity(0.2), in: Capsule())
            .foregroundStyle(tuple.1)
    }
}

private struct NativeAdminInquiryDetailSheet: View {
    let inquiry: NativeInquiry

    var body: some View {
        NavigationStack {
            List {
                Section("Inquiry") {
                    keyValue("Code", inquiry.no_inquiry_code ? "No Code" : (inquiry.inquiry_code ?? "-"))
                    keyValue("Phone", inquiry.contact_phone)
                    keyValue("Email", inquiry.contact_email)
                    keyValue("Created", inquiry.created_at)
                }

                Section("Details") {
                    Text(inquiry.details)
                        .font(.body)
                }

                Section("Messages") {
                    if inquiry.messages.isEmpty {
                        Text("No messages")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(inquiry.messages) { msg in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(msg.sender_role.capitalized)
                                        .font(.caption.weight(.semibold))
                                    Spacer()
                                    Text(msg.created_at)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                Text(msg.body)
                                    .font(.subheadline)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .navigationTitle("Inquiry Detail")
        }
    }

    private func keyValue(_ key: String, _ value: String) -> some View {
        HStack {
            Text(key)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.trailing)
        }
    }
}
