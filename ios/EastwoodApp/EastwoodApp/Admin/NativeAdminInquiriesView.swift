import SwiftUI
import UIKit

private enum AdminInquiryFilter: CaseIterable, Identifiable {
    case all, pending, processed, archived
    var id: String {
        switch self {
        case .all: return "all"
        case .pending: return "pending"
        case .processed: return "processed"
        case .archived: return "archived"
        }
    }
}

private enum AdminNoCodeFilter: CaseIterable, Identifiable {
    case all, onlyNoCode, onlyWithCode
    var id: String {
        switch self {
        case .all: return "all"
        case .onlyNoCode: return "onlyNoCode"
        case .onlyWithCode: return "onlyWithCode"
        }
    }
}

private enum AdminUnreadFilter: CaseIterable, Identifiable {
    case all, onlyUnread, onlyRead
    var id: String {
        switch self {
        case .all: return "all"
        case .onlyUnread: return "onlyUnread"
        case .onlyRead: return "onlyRead"
        }
    }
}

struct NativeAdminInquiriesView: View {
    @EnvironmentObject private var language: LanguageManager
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
                    title: language.text("admin.accessRequired"),
                    message: language.text("admin.inquiries.subtitle")
                )
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(language.text("admin.inquiries.center"))
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundStyle(EastwoodTheme.ink)
                            Text(language.text("admin.inquiries.subtitle"))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .eastwoodPanel()

                        Picker(language.text("admin.filter"), selection: $filter) {
                            ForEach(AdminInquiryFilter.allCases) { item in
                                Text(inquiryFilterLabel(item)).tag(item)
                            }
                        }
                        .pickerStyle(.segmented)
                        .padding(12)
                        .eastwoodPanel()

                        TextField(language.text("admin.searchInquiries"), text: $query)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                            .eastwoodInput()

                        HStack {
                            Picker(language.text("admin.noCode"), selection: $noCodeFilter) {
                                ForEach(AdminNoCodeFilter.allCases) { item in
                                    Text(noCodeFilterLabel(item)).tag(item)
                                }
                            }
                            .pickerStyle(.menu)

                            Picker(language.text("admin.unread"), selection: $unreadFilter) {
                                ForEach(AdminUnreadFilter.allCases) { item in
                                    Text(unreadFilterLabel(item)).tag(item)
                                }
                            }
                            .pickerStyle(.menu)
                        }

                        HStack {
                            let pendingCount = manager.inquiries.filter { !$0.is_processed && !$0.is_archived }.count
                            let processedCount = manager.inquiries.filter { $0.is_processed && !$0.is_archived }.count
                            let archivedCount = manager.inquiries.filter { $0.is_archived }.count
                            Text("\(filtered.count) \(language.text("profile.inquiries"))")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(language.format("admin.inquiries.stats", String(pendingCount), String(processedCount), String(archivedCount)))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Button(selectionMode ? language.text("admin.done") : language.text("admin.select")) {
                                selectionMode.toggle()
                                if !selectionMode { selectedIds.removeAll() }
                            }
                            .buttonStyle(EastwoodSecondaryButtonStyle())
                            .disabled(filtered.isEmpty || isOperating)
                        }

                        HStack {
                            ShareLink(item: exportCSV, subject: Text(language.text("admin.inquiries.title")), message: Text(language.text("admin.exportCsv"))) {
                                Label(language.text("admin.exportCsv"), systemImage: "square.and.arrow.up")
                            }
                            .disabled(filtered.isEmpty)
                            Spacer()
                        }

                        if let err = manager.errorMessage {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(err).foregroundStyle(.red)
                                Button(language.text("admin.retry")) {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    Task { await manager.load(token: auth.accessToken) }
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                            }
                            .padding(14)
                            .eastwoodPanel()
                        }

                        if !manager.isLoading && manager.errorMessage == nil && filtered.isEmpty {
                            Text(language.text("admin.inquiries.empty"))
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
                                    Text(inquiry.no_inquiry_code ? language.text("admin.noCodeInquiry") : (inquiry.inquiry_code ?? language.text("profile.inquiries")))
                                        .font(.headline)
                                    Spacer()
                                    statusChip(inquiry)
                                }

                                Text(inquiry.details)
                                    .font(.subheadline)
                                    .lineLimit(2)
                                    .foregroundStyle(.secondary)

                                HStack(spacing: 8) {
                                    Button(language.text("admin.view")) {
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                        selected = inquiry
                                    }
                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                    .disabled(isOperating)

                                    if !inquiry.is_processed && !inquiry.is_archived {
                                        Button(actionTitle(for: inquiry, defaultText: language.text("admin.process"), isProcessed: true, isArchived: false, label: language.text("admin.process"))) {
                                            Task {
                                                if !isConfirming(inquiry, isProcessed: true, isArchived: false, label: language.text("admin.process")) {
                                                    statusConfirmState = (inquiry.id, true, false, language.text("admin.process"))
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

                                    Button(actionTitle(for: inquiry, defaultText: inquiry.is_archived ? language.text("admin.restore") : language.text("admin.archive"), isProcessed: nil, isArchived: !inquiry.is_archived, label: inquiry.is_archived ? language.text("admin.restore") : language.text("admin.archive"))) {
                                        Task {
                                            let nextArchived = !inquiry.is_archived
                                            let label = inquiry.is_archived ? language.text("admin.restore") : language.text("admin.archive")
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
                                Button(language.text("admin.processSelected")) {
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

                                Button(language.text("admin.archiveSelected")) {
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
        .navigationTitle(language.text("admin.inquiries.title"))
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
        isConfirming(inquiry, isProcessed: isProcessed, isArchived: isArchived, label: label) ? language.text("admin.tapAgain") : defaultText
    }

    private func inquiryFilterLabel(_ item: AdminInquiryFilter) -> String {
        switch item {
        case .all: return language.text("admin.artworks.all")
        case .pending: return language.text("inbox.pending")
        case .processed: return language.text("inbox.processed")
        case .archived: return language.text("inbox.archived")
        }
    }

    private func noCodeFilterLabel(_ item: AdminNoCodeFilter) -> String {
        switch item {
        case .all: return language.text("admin.noCode.all")
        case .onlyNoCode: return language.text("admin.noCode.only")
        case .onlyWithCode: return language.text("admin.noCode.withCode")
        }
    }

    private func unreadFilterLabel(_ item: AdminUnreadFilter) -> String {
        switch item {
        case .all: return language.text("admin.unread.all")
        case .onlyUnread: return language.text("admin.unread.only")
        case .onlyRead: return language.text("admin.unread.read")
        }
    }

    private func statusChip(_ inquiry: NativeInquiry) -> some View {
        let tuple: (String, Color) = {
            if inquiry.is_archived { return (language.text("inbox.archived"), .gray) }
            if inquiry.is_processed { return (language.text("inbox.processed"), .green) }
            return (language.text("inbox.pending"), .orange)
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
    @EnvironmentObject private var language: LanguageManager
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
                Section(language.text("admin.inquirySection")) {
                    keyValue(language.text("admin.code"), latestInquiry.no_inquiry_code ? language.text("admin.noCodeInquiry") : (latestInquiry.inquiry_code ?? "-"))
                    keyValue(language.text("admin.phone"), latestInquiry.contact_phone)
                    keyValue(language.text("admin.email"), latestInquiry.contact_email)
                    keyValue(language.text("admin.created"), latestInquiry.created_at)
                }

                Section(language.text("admin.detailsSection")) {
                    Text(latestInquiry.details)
                        .font(.body)
                }

                Section(language.text("admin.actionsSection")) {
                    if let actionError, !actionError.isEmpty {
                        Text(actionError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                    HStack(spacing: 8) {
                        if !latestInquiry.is_processed && !latestInquiry.is_archived {
                            Button(actionButtonTitle(defaultText: language.text("admin.process"), isProcessed: true, isArchived: false, label: language.text("admin.process"))) {
                                Task {
                                    if !isConfirming(isProcessed: true, isArchived: false, label: language.text("admin.process")) {
                                        statusConfirmState = (true, false, language.text("admin.process"))
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
                                        actionError = manager.actionErrorMessage ?? language.text("admin.statusUpdateFailed")
                                    }
                                    statusConfirmState = nil
                                    isOperating = false
                                }
                            }
                            .disabled(isOperating)
                        }

                        Button(actionButtonTitle(defaultText: latestInquiry.is_archived ? language.text("admin.restore") : language.text("admin.archive"), isProcessed: nil, isArchived: !latestInquiry.is_archived, label: latestInquiry.is_archived ? language.text("admin.restore") : language.text("admin.archive"))) {
                            Task {
                                let nextArchived = !latestInquiry.is_archived
                                let label = latestInquiry.is_archived ? language.text("admin.restore") : language.text("admin.archive")
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
                                    actionError = manager.actionErrorMessage ?? language.text("admin.statusUpdateFailed")
                                }
                                statusConfirmState = nil
                                isOperating = false
                            }
                        }
                        .disabled(isOperating)
                    }
                    .buttonStyle(.bordered)
                }

                Section(language.text("admin.messagesSection")) {
                    if latestInquiry.messages.isEmpty {
                        Text(language.text("admin.noMessages"))
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
                .scrollContentBackground(.hidden)
                HStack(spacing: 8) {
                    TextField(language.text("admin.replyToUser"), text: $replyText)
                        .textFieldStyle(.roundedBorder)
                    Button(language.text("admin.send")) {
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
                                actionError = manager.actionErrorMessage ?? language.text("admin.replyFailed")
                            }
                            isOperating = false
                        }
                    }
                    .disabled(isOperating || latestInquiry.is_archived)
                }
                .padding()
                .background(.ultraThinMaterial)
            }
            .navigationTitle(language.text("admin.inquiryDetail"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(language.text("admin.close")) { dismiss() }
                }
            }
            .background(EastwoodBackground())
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
        isConfirming(isProcessed: isProcessed, isArchived: isArchived, label: label) ? language.text("admin.tapAgain") : defaultText
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
