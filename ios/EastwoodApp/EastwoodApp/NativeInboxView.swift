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

    private var unreadCount: Int {
        inquiryManager.inquiries.reduce(0) { partial, inquiry in
            partial + inquiry.messages.filter { $0.sender_role == "admin" && !$0.is_read }.count
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
                            Text(language.text("inbox.empty"))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
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
                                    VStack(alignment: .leading, spacing: 6) {
                                        HStack {
                                            Text(inquiry.no_inquiry_code ? language.text("inbox.noCodeInquiry") : (inquiry.inquiry_code ?? language.text("inbox.inquiry")))
                                                .font(.headline)
                                            Spacer()
                                            statusBadge(for: inquiry)
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
            text = language.text("inbox.processed"); color = .green
        } else {
            text = language.text("inbox.pending"); color = .orange
        }

        return Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.2), in: Capsule())
            .foregroundStyle(color)
    }

    private func conversationSheet(_ inquiry: NativeInquiry) -> some View {
        NavigationStack {
            VStack(spacing: 12) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(inquiry.messages) { msg in
                            HStack {
                                if msg.sender_role == "admin" { Spacer(minLength: 36) }
                                Text(msg.body)
                                    .padding(10)
                                    .frame(maxWidth: .infinity, alignment: msg.sender_role == "admin" ? .leading : .trailing)
                                    .background(msg.sender_role == "admin" ? Color.white.opacity(0.08) : Color(red: 0.93, green: 0.78, blue: 0.38).opacity(0.22), in: RoundedRectangle(cornerRadius: 10))
                                if msg.sender_role != "admin" { Spacer(minLength: 36) }
                            }
                        }
                    }
                    .padding()
                }

                HStack {
                    TextField(language.text("inbox.reply"), text: $replyText)
                        .textFieldStyle(.roundedBorder)
                        .disabled(inquiry.is_archived)
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
}
