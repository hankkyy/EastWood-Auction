import SwiftUI
import UIKit

private enum InboxSegment: CaseIterable, Identifiable {
    case pending
    case processed
    case archived

    var id: String {
        switch self {
        case .pending: return "pending"
        case .processed: return "processed"
        case .archived: return "archived"
        }
    }
}

struct NativeInboxView: View {
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var inquiryManager = NativeInquiryManager()
    @State private var selectedInquiry: NativeInquiry?
    @State private var replyText = ""
    @State private var segment: InboxSegment = .pending
    @State private var statusConfirmState: (id: String, isProcessed: Bool?, isArchived: Bool?, label: String)?

    private var currentUserRole: String {
        auth.isAdmin ? "admin" : "user"
    }

    private var incomingSenderRole: String {
        auth.isAdmin ? "user" : "admin"
    }

    private func hasUnread(_ inquiry: NativeInquiry) -> Bool {
        inquiry.messages.contains { $0.sender_role == incomingSenderRole && !$0.is_read }
    }

    private var unreadDot: some View {
        Circle()
            .fill(EastwoodTheme.collectionsAccent)
            .frame(width: 8, height: 8)
    }

    private var unreadCount: Int {
        inquiryManager.inquiries.reduce(0) { partial, inquiry in
            partial + inquiry.messages.filter { $0.sender_role == incomingSenderRole && !$0.is_read }.count
        }
    }

    private var segmentedInquiries: [NativeInquiry] {
        switch segment {
        case .pending:
            return inquiryManager.inquiries.filter { !$0.is_processed && !$0.is_archived }
        case .processed:
            return inquiryManager.inquiries.filter { $0.is_processed && !$0.is_archived }
        case .archived:
            return inquiryManager.inquiries.filter { $0.is_archived }
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if !auth.isAuthenticated {
                    Text(language.text("inbox.signInFirst"))
                        .foregroundStyle(.secondary)
                        .padding(.top, 16)
                        .eastwoodFillScreen(alignment: .top)
                } else if inquiryManager.isLoading {
                    inboxLoadingView
                } else {
                    VStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(language.text("inbox.title"))
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundStyle(EastwoodTheme.ink)
                            Text(auth.isAdmin ? language.text("inbox.adminDescription") : language.text("inbox.pageDescription"))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14)

                        Picker(language.text("inbox.title"), selection: $segment) {
                            Text(language.text("inbox.pending")).tag(InboxSegment.pending)
                            Text(language.text("inbox.processed")).tag(InboxSegment.processed)
                            Text(language.text("inbox.archived")).tag(InboxSegment.archived)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, 12)

                        HStack {
                            Text(language.format("inbox.unread", String(unreadCount)))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            Spacer()
                        }
                        .padding(.horizontal, 14)

                        if let actionError = inquiryManager.actionErrorMessage, !actionError.isEmpty {
                            Text(actionError)
                                .font(.footnote)
                                .foregroundStyle(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 14)
                        }

                        if let loadError = inquiryManager.errorMessage, !loadError.isEmpty {
                            HStack {
                                Text(loadError)
                                    .font(.footnote)
                                    .foregroundStyle(.red)
                                Spacer()
                                Button(language.text("inbox.retry")) {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    Task { await inquiryManager.load(token: auth.accessToken) }
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                            }
                            .padding(.horizontal, 14)
                        }

                        if segmentedInquiries.isEmpty {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(language.text("inbox.emptyTitle"))
                                    .font(.headline)
                                    .foregroundStyle(EastwoodTheme.ink)
                                Text(language.text("inbox.empty"))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .eastwoodPanel()
                            .padding(.horizontal, 14)
                        }

                        List {
                            ForEach(segmentedInquiries) { inquiry in
                                Button {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    selectedInquiry = inquiry
                                    Task {
                                        await inquiryManager.markRead(token: auth.accessToken, inquiryIds: [inquiry.id])
                                    }
                                } label: {
                                    HStack(spacing: 0) {
                                        // Unread indicator — blue accent bar
                                        if hasUnread(inquiry) {
                                            Rectangle()
                                                .fill(EastwoodTheme.collectionsAccent)
                                                .frame(width: 3)
                                                .padding(.vertical, 4)
                                        }

                                        VStack(alignment: .leading, spacing: 6) {
                                            HStack {
                                                Text(inquiry.no_inquiry_code ? language.text("inbox.noCodeInquiry") : (inquiry.inquiry_code ?? language.text("inbox.inquiry")))
                                                    .font(hasUnread(inquiry) ? .headline.weight(.bold) : .headline)
                                                Spacer()
                                                HStack(spacing: 6) {
                                                    if hasUnread(inquiry) {
                                                        unreadDot
                                                    }
                                                    statusBadge(for: inquiry)
                                                }
                                            }

                                            Text(inquiry.details)
                                                .lineLimit(1)
                                                .font(.subheadline)
                                                .foregroundStyle(.secondary)

                                        if auth.isAdmin {
                                            HStack(spacing: 10) {
                                                if !inquiry.is_processed && !inquiry.is_archived {
                                                    Button(actionTitle(for: inquiry, defaultText: language.text("inbox.markProcessed"), isProcessed: true, isArchived: false, label: language.text("inbox.markProcessed"))) {
                                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                        Task {
                                                            if !isConfirming(inquiry, isProcessed: true, isArchived: false, label: language.text("inbox.markProcessed")) {
                                                                statusConfirmState = (inquiry.id, true, false, language.text("inbox.markProcessed"))
                                                                return
                                                            }
                                                            let ok = await inquiryManager.updateInquiryStatus(
                                                                token: auth.accessToken,
                                                                inquiryId: inquiry.id,
                                                                isProcessed: true,
                                                                isArchived: false
                                                            )
                                                            if ok { await inquiryManager.load(token: auth.accessToken) }
                                                            statusConfirmState = nil
                                                        }
                                                    }
                                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                                }

                                                if !inquiry.is_archived {
                                                    Button(actionTitle(for: inquiry, defaultText: language.text("inbox.archive"), isProcessed: nil, isArchived: true, label: language.text("inbox.archive"))) {
                                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                        Task {
                                                            if !isConfirming(inquiry, isProcessed: nil, isArchived: true, label: language.text("inbox.archive")) {
                                                                statusConfirmState = (inquiry.id, nil, true, language.text("inbox.archive"))
                                                                return
                                                            }
                                                            let ok = await inquiryManager.updateInquiryStatus(
                                                                token: auth.accessToken,
                                                                inquiryId: inquiry.id,
                                                                isArchived: true
                                                            )
                                                            if ok { await inquiryManager.load(token: auth.accessToken) }
                                                            statusConfirmState = nil
                                                        }
                                                    }
                                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                                } else {
                                                    Button(actionTitle(for: inquiry, defaultText: language.text("inbox.restore"), isProcessed: nil, isArchived: false, label: language.text("inbox.restore"))) {
                                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                        Task {
                                                            if !isConfirming(inquiry, isProcessed: nil, isArchived: false, label: language.text("inbox.restore")) {
                                                                statusConfirmState = (inquiry.id, nil, false, language.text("inbox.restore"))
                                                                return
                                                            }
                                                            let ok = await inquiryManager.updateInquiryStatus(
                                                                token: auth.accessToken,
                                                                inquiryId: inquiry.id,
                                                                isArchived: false
                                                            )
                                                            if ok { await inquiryManager.load(token: auth.accessToken) }
                                                            statusConfirmState = nil
                                                        }
                                                    }
                                                    .buttonStyle(EastwoodSecondaryButtonStyle())
                                                }
                                            }
                                            .font(.caption)
                                        }
                                    }
                                    }
                                }
                            }
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                        .animation(EastwoodMotion.listUpdate, value: segmentedInquiries.count)
                        .refreshable {
                            await inquiryManager.load(token: auth.accessToken)
                        }
                    }
                }
            }
            .navigationTitle(language.text("inbox.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .sheet(item: $selectedInquiry) { inquiry in
                conversationSheet(inquiry)
            }
            .task {
                if auth.isAuthenticated {
                    await inquiryManager.load(token: auth.accessToken)
                }
            }
            .onChange(of: auth.accessToken) { newValue in
                Task {
                    if !newValue.isEmpty {
                        await inquiryManager.load(token: newValue)
                    } else {
                        inquiryManager.inquiries = []
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .eastwoodScreen()
            .eastwoodEnterMotion(id: "inbox-page")
        }
    }

    private func isConfirming(_ inquiry: NativeInquiry, isProcessed: Bool?, isArchived: Bool?, label: String) -> Bool {
        guard let state = statusConfirmState else { return false }
        return state.id == inquiry.id && state.isProcessed == isProcessed && state.isArchived == isArchived && state.label == label
    }

    private func actionTitle(for inquiry: NativeInquiry, defaultText: String, isProcessed: Bool?, isArchived: Bool?, label: String) -> String {
        isConfirming(inquiry, isProcessed: isProcessed, isArchived: isArchived, label: label) ? language.text("inbox.tapAgain") : defaultText
    }

    private var inboxLoadingView: some View {
        VStack(spacing: 12) {
            Picker(language.text("inbox.title"), selection: .constant(InboxSegment.pending)) {
                Text(language.text("inbox.pending")).tag(InboxSegment.pending)
                Text(language.text("inbox.processed")).tag(InboxSegment.processed)
                Text(language.text("inbox.archived")).tag(InboxSegment.archived)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 12)
            .disabled(true)

            ScrollView {
                EastwoodSkeletonList(count: 4)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
            }
            .scrollIndicators(.hidden)
        }
        .eastwoodFillScreen(alignment: .top)
    }

    private func statusBadge(for inquiry: NativeInquiry) -> some View {
        let text: String
        let color: Color
        if inquiry.is_archived {
            text = language.text("inbox.archived"); color = .gray
        } else if inquiry.is_processed {
            text = language.text("inbox.processed"); color = EastwoodTheme.success
        } else {
            text = language.text("inbox.pending"); color = EastwoodTheme.warning
        }

        return Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.12), in: Capsule())
            .foregroundStyle(color)
    }

    private func conversationSheet(_ inquiry: NativeInquiry) -> some View {
        NavigationStack {
            VStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(inquiry.no_inquiry_code ? language.text("inbox.noCodeInquiry") : (inquiry.inquiry_code ?? language.text("inbox.inquiry")))
                        .font(.headline)
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("inbox.details"))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(inquiry.details)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 12) {
                        if !inquiry.contact_phone.isEmpty {
                            detailPill(label: language.text("inbox.contactPhone"), value: inquiry.contact_phone)
                        }
                        if !inquiry.contact_email.isEmpty {
                            detailPill(label: language.text("inbox.contactEmail"), value: inquiry.contact_email)
                        }
                    }

                    detailPill(label: language.text("inbox.submittedAt"), value: shortDate(inquiry.created_at))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 14)
                .padding(.top, 12)

                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(inquiry.messages) { msg in
                            let isOwnMessage = msg.sender_role == currentUserRole
                            let bubbleColor: Color = msg.sender_role == "admin"
                                ? EastwoodTheme.collectionsAccent.opacity(0.18)
                                : EastwoodTheme.gold.opacity(0.18)
                            HStack {
                                if isOwnMessage { Spacer(minLength: 36) }
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(msg.body)
                                        .font(.subheadline)
                                        .foregroundStyle(EastwoodTheme.ink)
                                    Text(shortDate(msg.created_at))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(10)
                                .frame(maxWidth: 280, alignment: .leading)
                                .background(bubbleColor, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(EastwoodTheme.hairline, lineWidth: 1)
                                )
                                if !isOwnMessage { Spacer(minLength: 36) }
                            }
                        }
                    }
                    .padding()
                }

                HStack {
                    ZStack(alignment: .topLeading) {
                        TextEditor(text: $replyText)
                            .frame(minHeight: 38, maxHeight: 120)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(EastwoodTheme.searchFill)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(EastwoodTheme.inputBorder, lineWidth: 0.5)
                            )
                            .disabled(inquiry.is_archived)
                        if replyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            Text(language.text("inbox.reply"))
                                .font(.subheadline).foregroundStyle(.secondary.opacity(0.6))
                                .padding(.horizontal, 14).padding(.vertical, 11)
                                .allowsHitTesting(false)
                        }
                    }
                    Button(language.text("inbox.send")) {
                        let body = replyText.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !body.isEmpty else { return }
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        Task {
                            let ok = await inquiryManager.sendMessage(token: auth.accessToken, inquiryId: inquiry.id, body: body)
                            if ok {
                                replyText = ""
                                await inquiryManager.load(token: auth.accessToken)
                            }
                        }
                    }
                    .disabled(inquiry.is_archived)
                }
                .padding()

                Text(auth.isAdmin ? language.text("inbox.replyBoxAdmin") : language.text("inbox.replyBoxUser"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .padding(.top, -6)

                if inquiry.is_archived {
                    Text(language.text("inbox.readOnly"))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.bottom, 8)
                }
            }
            .navigationTitle(language.text("inbox.conversation"))
            .navigationBarTitleDisplayMode(.inline)
            .background(EastwoodBackground())
        }
    }

    private func detailPill(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption)
                .foregroundStyle(EastwoodTheme.ink)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(EastwoodTheme.panelSoft, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(EastwoodTheme.hairline, lineWidth: 1)
        )
    }

    private func shortDate(_ raw: String) -> String {
        raw.replacingOccurrences(of: "T", with: " ")
            .replacingOccurrences(of: "Z", with: "")
            .prefix(16)
            .description
    }
}
