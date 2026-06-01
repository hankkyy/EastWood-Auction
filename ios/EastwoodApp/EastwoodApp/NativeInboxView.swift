import SwiftUI
import UIKit

private enum InboxSegment: String, CaseIterable, Identifiable {
    case pending = "Pending"
    case processed = "Processed"
    case archived = "Archived"

    var id: String { rawValue }
}

struct NativeInboxView: View {
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
                    Text("Please sign in first")
                        .foregroundStyle(.secondary)
                        .padding(.top, 16)
                        .eastwoodFillScreen(alignment: .top)
                } else if inquiryManager.isLoading {
                    inboxLoadingView
                } else {
                    VStack(spacing: 10) {
                        Picker("Inbox", selection: $segment) {
                            Text("Pending").tag(InboxSegment.pending)
                            Text("Processed").tag(InboxSegment.processed)
                            Text("Archived").tag(InboxSegment.archived)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, 12)

                        HStack {
                            Text("Unread: \(unreadCount)")
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
                                Button("Retry") {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    Task { await inquiryManager.load(token: auth.accessToken) }
                                }
                                .buttonStyle(EastwoodSecondaryButtonStyle())
                            }
                            .padding(.horizontal, 14)
                        }

                        if segmentedInquiries.isEmpty {
                            Text("No inquiries in this state")
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
                                            Text(inquiry.no_inquiry_code ? "No Code Inquiry" : (inquiry.inquiry_code ?? "Inquiry"))
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
                                                    Button(actionTitle(for: inquiry, defaultText: "Mark Processed", isProcessed: true, isArchived: false, label: "Mark Processed")) {
                                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                        Task {
                                                            if !isConfirming(inquiry, isProcessed: true, isArchived: false, label: "Mark Processed") {
                                                                statusConfirmState = (inquiry.id, true, false, "Mark Processed")
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
                                                    Button(actionTitle(for: inquiry, defaultText: "Archive", isProcessed: nil, isArchived: true, label: "Archive")) {
                                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                        Task {
                                                            if !isConfirming(inquiry, isProcessed: nil, isArchived: true, label: "Archive") {
                                                                statusConfirmState = (inquiry.id, nil, true, "Archive")
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
                                                    Button(actionTitle(for: inquiry, defaultText: "Restore", isProcessed: nil, isArchived: false, label: "Restore")) {
                                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                                        Task {
                                                            if !isConfirming(inquiry, isProcessed: nil, isArchived: false, label: "Restore") {
                                                                statusConfirmState = (inquiry.id, nil, false, "Restore")
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
                        .animation(EastwoodMotion.listUpdate, value: segmentedInquiries.count)
                        .refreshable {
                            await inquiryManager.load(token: auth.accessToken)
                        }
                    }
                }
            }
            .navigationTitle("Inbox")
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
            .background(Color.black.ignoresSafeArea())
            .background(EastwoodBackground())
            .eastwoodEnterMotion(id: "inbox-page")
        }
    }

    private func isConfirming(_ inquiry: NativeInquiry, isProcessed: Bool?, isArchived: Bool?, label: String) -> Bool {
        guard let state = statusConfirmState else { return false }
        return state.id == inquiry.id && state.isProcessed == isProcessed && state.isArchived == isArchived && state.label == label
    }

    private func actionTitle(for inquiry: NativeInquiry, defaultText: String, isProcessed: Bool?, isArchived: Bool?, label: String) -> String {
        isConfirming(inquiry, isProcessed: isProcessed, isArchived: isArchived, label: label) ? "Tap Again" : defaultText
    }

    private var inboxLoadingView: some View {
        VStack(spacing: 12) {
            Picker("Inbox", selection: .constant(InboxSegment.pending)) {
                Text("Pending").tag(InboxSegment.pending)
                Text("Processed").tag(InboxSegment.processed)
                Text("Archived").tag(InboxSegment.archived)
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
            text = "Archived"; color = .gray
        } else if inquiry.is_processed {
            text = "Processed"; color = .green
        } else {
            text = "Pending"; color = .orange
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
                    TextField("Reply...", text: $replyText)
                        .textFieldStyle(.roundedBorder)
                        .disabled(inquiry.is_archived)
                    Button("Send") {
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
                    Text("Archived inquiries are read-only.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.bottom, 8)
                }
            }
            .navigationTitle("Conversation")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
