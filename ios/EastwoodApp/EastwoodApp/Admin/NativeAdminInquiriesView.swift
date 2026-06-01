import SwiftUI
import UIKit

private enum AdminInquiryFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case pending = "Pending"
    case processed = "Processed"
    case archived = "Archived"

    var id: String { rawValue }
}

private enum AdminNoCodeFilter: String, CaseIterable, Identifiable {
    case all = "NoCode: All"
    case onlyNoCode = "Only NoCode"
    case onlyWithCode = "Only WithCode"
    var id: String { rawValue }
}

private enum AdminUnreadFilter: String, CaseIterable, Identifiable {
    case all = "Unread: All"
    case onlyUnread = "Only Unread"
    case onlyRead = "Only Read"
    var id: String { rawValue }
}

struct NativeAdminInquiriesView: View {
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var manager = NativeInquiryManager()

    @State private var filter: AdminInquiryFilter = .pending
    @State private var noCodeFilter: AdminNoCodeFilter = .all
    @State private var unreadFilter: AdminUnreadFilter = .all
    @State private var query = ""
    @State private var selected: NativeInquiry?
    @State private var selectionMode = false
    @State private var selectedIds: Set<String> = []
    @State private var isOperating = false
    @State private var statusConfirmState: (id: String, isProcessed: Bool?, isArchived: Bool?, label: String)?

    private var filtered: [NativeInquiry] {
        let base: [NativeInquiry]
        switch filter {
        case .all:
            base = manager.inquiries
        case .pending:
            base = manager.inquiries.filter { !$0.is_processed && !$0.is_archived }
        case .processed:
            base = manager.inquiries.filter { $0.is_processed && !$0.is_archived }
        case .archived:
            base = manager.inquiries.filter { $0.is_archived }
        }

        let keyword = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        var list = keyword.isEmpty ? base : base.filter { inquiry in
            let code = inquiry.inquiry_code?.lowercased() ?? ""
            return code.contains(keyword)
                || inquiry.details.lowercased().contains(keyword)
                || inquiry.contact_phone.lowercased().contains(keyword)
                || inquiry.contact_email.lowercased().contains(keyword)
        }

        switch noCodeFilter {
        case .all:
            break
        case .onlyNoCode:
            list = list.filter { $0.no_inquiry_code }
        case .onlyWithCode:
            list = list.filter { !$0.no_inquiry_code }
        }

        switch unreadFilter {
        case .all:
            break
        case .onlyUnread:
            list = list.filter { inquiry in
                inquiry.messages.contains { $0.sender_role == "admin" && !$0.is_read }
            }
        case .onlyRead:
            list = list.filter { inquiry in
                !inquiry.messages.contains { $0.sender_role == "admin" && !$0.is_read }
            }
        }
        return list
    }

    private var exportCSV: String {
        var rows = ["id,inquiry_code,no_inquiry_code,is_processed,is_archived,contact_phone,contact_email,created_at,details"]
        for item in filtered {
            let escaped = item.details.replacingOccurrences(of: "\"", with: "\"\"")
            rows.append("\(item.id),\(item.inquiry_code ?? ""),\(item.no_inquiry_code),\(item.is_processed),\(item.is_archived),\(item.contact_phone),\(item.contact_email),\(item.created_at),\"\(escaped)\"")
        }
        return rows.joined(separator: "\n")
    }

    var body: some View {
        let pad = EastwoodLayout.pagePadding(for: UIScreen.main.bounds.width)
        Group {
            if !auth.isAdmin {
                EastwoodStateView(
                    systemImage: "lock.shield",
                    title: "Admin Access Required",
                    message: "Only administrator accounts can access inquiry management."
                )
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Inquiry Center")
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundStyle(EastwoodTheme.goldSoft)
                            Text("Review and process customer inquiries with cloud-synced status.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .eastwoodPanel()

                        Picker("Filter", selection: $filter) {
                            ForEach(AdminInquiryFilter.allCases) { item in
                                Text(item.rawValue).tag(item)
                            }
                        }
                        .pickerStyle(.segmented)
                        .padding(12)
                        .eastwoodPanel()

                        TextField("Search code / details / phone / email", text: $query)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                            .eastwoodInput()

                        HStack {
                            Picker("NoCode", selection: $noCodeFilter) {
                                ForEach(AdminNoCodeFilter.allCases) { item in
                                    Text(item.rawValue).tag(item)
                                }
                            }
                            .pickerStyle(.menu)

                            Picker("Unread", selection: $unreadFilter) {
                                ForEach(AdminUnreadFilter.allCases) { item in
                                    Text(item.rawValue).tag(item)
                                }
                            }
                            .pickerStyle(.menu)
                        }

                        HStack {
                            let pendingCount = manager.inquiries.filter { !$0.is_processed && !$0.is_archived }.count
                            let processedCount = manager.inquiries.filter { $0.is_processed && !$0.is_archived }.count
                            let archivedCount = manager.inquiries.filter { $0.is_archived }.count
                            Text("\(filtered.count) inquiries")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("P \(pendingCount) · R \(processedCount) · A \(archivedCount)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Button(selectionMode ? "Done" : "Select") {
                                selectionMode.toggle()
                                if !selectionMode { selectedIds.removeAll() }
                            }
                            .buttonStyle(EastwoodSecondaryButtonStyle())
                            .disabled(filtered.isEmpty || isOperating)
                        }

                        HStack {
                            ShareLink(item: exportCSV, subject: Text("Admin Inquiries Export"), message: Text("Filtered inquiries CSV")) {
                                Label("Export CSV", systemImage: "square.and.arrow.up")
                            }
                            .disabled(filtered.isEmpty)
                            Spacer()
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
                            .padding(14)
                            .eastwoodPanel()
                        }

                        if !manager.isLoading && manager.errorMessage == nil && filtered.isEmpty {
                            Text("No inquiries in this state")
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .eastwoodPanel()
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
                                    .disabled(isOperating)

                                    if !inquiry.is_processed && !inquiry.is_archived {
                                        Button(actionTitle(for: inquiry, defaultText: "Process", isProcessed: true, isArchived: false, label: "Process")) {
                                            Task {
                                                if !isConfirming(inquiry, isProcessed: true, isArchived: false, label: "Process") {
                                                    statusConfirmState = (inquiry.id, true, false, "Process")
                                                    return
                                                }
                                                isOperating = true
                                                _ = await manager.updateInquiryStatus(
                                                    token: auth.accessToken,
                                                    inquiryId: inquiry.id,
                                                    isProcessed: true,
                                                    isArchived: false
                                                )
                                                await manager.load(token: auth.accessToken)
                                                statusConfirmState = nil
                                                isOperating = false
                                            }
                                        }
                                        .buttonStyle(EastwoodSecondaryButtonStyle())
                                        .disabled(isOperating)
                                    }

                                    Button(actionTitle(for: inquiry, defaultText: inquiry.is_archived ? "Restore" : "Archive", isProcessed: nil, isArchived: !inquiry.is_archived, label: inquiry.is_archived ? "Restore" : "Archive")) {
                                        Task {
                                            let nextArchived = !inquiry.is_archived
                                            let label = inquiry.is_archived ? "Restore" : "Archive"
                                            if !isConfirming(inquiry, isProcessed: nil, isArchived: nextArchived, label: label) {
                                                statusConfirmState = (inquiry.id, nil, nextArchived, label)
                                                return
                                            }
                                            isOperating = true
                                            _ = await manager.updateInquiryStatus(
                                                token: auth.accessToken,
                                                inquiryId: inquiry.id,
                                                isArchived: nextArchived
                                            )
                                            await manager.load(token: auth.accessToken)
                                            statusConfirmState = nil
                                            isOperating = false
                                        }
                                    }
                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                    .disabled(isOperating)
                                }
                                .font(.caption)
                            }
                            .padding(14)
                            .eastwoodPanel()
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

                        if selectionMode {
                            HStack(spacing: 10) {
                                Button("Process Selected") {
                                    Task {
                                        isOperating = true
                                        for id in selectedIds {
                                            _ = await manager.updateInquiryStatus(
                                                token: auth.accessToken,
                                                inquiryId: id,
                                                isProcessed: true,
                                                isArchived: false
                                            )
                                        }
                                        selectedIds.removeAll()
                                        statusConfirmState = nil
                                        await manager.load(token: auth.accessToken)
                                        isOperating = false
                                    }
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                                .disabled(selectedIds.isEmpty || isOperating)

                                Button("Archive Selected") {
                                    Task {
                                        isOperating = true
                                        for id in selectedIds {
                                            _ = await manager.updateInquiryStatus(
                                                token: auth.accessToken,
                                                inquiryId: id,
                                                isArchived: true
                                            )
                                        }
                                        selectedIds.removeAll()
                                        statusConfirmState = nil
                                        await manager.load(token: auth.accessToken)
                                        isOperating = false
                                    }
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                                .disabled(selectedIds.isEmpty || isOperating)
                            }
                        }
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
        .navigationTitle("Admin Inquiries")
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
        .sheet(item: $selected) { inquiry in
            NativeAdminInquiryDetailSheet(
                inquiry: inquiry,
                manager: manager,
                token: auth.accessToken
            )
        }
    }

    private func isConfirming(_ inquiry: NativeInquiry, isProcessed: Bool?, isArchived: Bool?, label: String) -> Bool {
        guard let state = statusConfirmState else { return false }
        return state.id == inquiry.id && state.isProcessed == isProcessed && state.isArchived == isArchived && state.label == label
    }

    private func actionTitle(for inquiry: NativeInquiry, defaultText: String, isProcessed: Bool?, isArchived: Bool?, label: String) -> String {
        isConfirming(inquiry, isProcessed: isProcessed, isArchived: isArchived, label: label) ? "Tap Again" : defaultText
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
    @ObservedObject var manager: NativeInquiryManager
    let token: String
    @Environment(\.dismiss) private var dismiss
    @State private var replyText = ""
    @State private var isOperating = false
    @State private var actionError: String?
    @State private var statusConfirmState: (isProcessed: Bool?, isArchived: Bool?, label: String)?

    private var latestInquiry: NativeInquiry {
        manager.inquiries.first(where: { $0.id == inquiry.id }) ?? inquiry
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                List {
                Section("Inquiry") {
                    keyValue("Code", latestInquiry.no_inquiry_code ? "No Code" : (latestInquiry.inquiry_code ?? "-"))
                    keyValue("Phone", latestInquiry.contact_phone)
                    keyValue("Email", latestInquiry.contact_email)
                    keyValue("Created", latestInquiry.created_at)
                }

                Section("Details") {
                    Text(latestInquiry.details)
                        .font(.body)
                }

                Section("Actions") {
                    if let actionError, !actionError.isEmpty {
                        Text(actionError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                    HStack(spacing: 8) {
                        if !latestInquiry.is_processed && !latestInquiry.is_archived {
                            Button(actionButtonTitle(defaultText: "Process", isProcessed: true, isArchived: false, label: "Process")) {
                                Task {
                                    if !isConfirming(isProcessed: true, isArchived: false, label: "Process") {
                                        statusConfirmState = (true, false, "Process")
                                        return
                                    }
                                    isOperating = true
                                    let ok = await manager.updateInquiryStatus(
                                        token: token,
                                        inquiryId: latestInquiry.id,
                                        isProcessed: true,
                                        isArchived: false
                                    )
                                    if ok {
                                        await manager.load(token: token)
                                        actionError = nil
                                    } else {
                                        actionError = manager.actionErrorMessage ?? "Status update failed."
                                    }
                                    statusConfirmState = nil
                                    isOperating = false
                                }
                            }
                            .disabled(isOperating)
                        }

                        Button(actionButtonTitle(defaultText: latestInquiry.is_archived ? "Restore" : "Archive", isProcessed: nil, isArchived: !latestInquiry.is_archived, label: latestInquiry.is_archived ? "Restore" : "Archive")) {
                            Task {
                                let nextArchived = !latestInquiry.is_archived
                                let label = latestInquiry.is_archived ? "Restore" : "Archive"
                                if !isConfirming(isProcessed: nil, isArchived: nextArchived, label: label) {
                                    statusConfirmState = (nil, nextArchived, label)
                                    return
                                }
                                isOperating = true
                                let ok = await manager.updateInquiryStatus(
                                    token: token,
                                    inquiryId: latestInquiry.id,
                                    isArchived: nextArchived
                                )
                                if ok {
                                    await manager.load(token: token)
                                    actionError = nil
                                } else {
                                    actionError = manager.actionErrorMessage ?? "Status update failed."
                                }
                                statusConfirmState = nil
                                isOperating = false
                            }
                        }
                        .disabled(isOperating)
                    }
                    .buttonStyle(.bordered)
                }

                Section("Messages") {
                    if latestInquiry.messages.isEmpty {
                        Text("No messages")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(latestInquiry.messages) { msg in
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
                HStack(spacing: 8) {
                    TextField("Reply to user...", text: $replyText)
                        .textFieldStyle(.roundedBorder)
                    Button("Send") {
                        let body = replyText.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !body.isEmpty else { return }
                        Task {
                            isOperating = true
                            let ok = await manager.sendMessage(token: token, inquiryId: latestInquiry.id, body: body)
                            if ok {
                                replyText = ""
                                await manager.load(token: token)
                                actionError = nil
                            } else {
                                actionError = manager.actionErrorMessage ?? "Reply failed."
                            }
                            isOperating = false
                        }
                    }
                    .disabled(isOperating || latestInquiry.is_archived)
                }
                .padding()
                .background(.ultraThinMaterial)
            }
            .navigationTitle("Inquiry Detail")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                await manager.load(token: token)
            }
        }
    }

    private func isConfirming(isProcessed: Bool?, isArchived: Bool?, label: String) -> Bool {
        guard let state = statusConfirmState else { return false }
        return state.isProcessed == isProcessed && state.isArchived == isArchived && state.label == label
    }

    private func actionButtonTitle(defaultText: String, isProcessed: Bool?, isArchived: Bool?, label: String) -> String {
        isConfirming(isProcessed: isProcessed, isArchived: isArchived, label: label) ? "Tap Again" : defaultText
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
