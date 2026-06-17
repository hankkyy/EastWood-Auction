import SwiftUI
import UIKit

struct NativeInquiryFormView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var language: LanguageManager
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var inquiryManager = NativeInquiryManager()

    private let prefilledCode: String?

    @State private var code = ""
    @State private var noInquiryCode = false
    @State private var details = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var statusText = ""
    @State private var isSubmitting = false
    @State private var showInbox = false

    init(prefilledCode: String? = nil) {
        self.prefilledCode = prefilledCode
    }

    private var isValid: Bool {
        !details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && email.contains("@")
            && (noInquiryCode || !code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text(language.text("inquiry.title"))
                        .font(.system(size: 24, weight: .bold, design: .serif))
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("inquiry.pageDescription"))
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .eastwoodPanel()

                if !auth.isAuthenticated {
                    EastwoodStateView(
                        systemImage: "person.crop.circle.badge.exclamationmark",
                        title: language.text("inquiry.signInRequired"),
                        message: language.text("inquiry.signInRequired.message")
                    )
                } else if auth.isAdmin {
                    EastwoodStateView(
                        systemImage: "lock.shield",
                        title: language.text("inquiry.personalUsersOnly"),
                        message: language.text("inquiry.personalUsersOnly.message")
                    )
                } else {
                    // Form fields
                    VStack(spacing: 14) {
                        Toggle(language.text("inquiry.noCode"), isOn: $noInquiryCode)
                            .toggleStyle(.switch).font(.footnote)

                        fieldSection(label: language.text("inquiry.code"), icon: "number") {
                            TextField(language.text("inquiry.code.placeholder"), text: $code)
                                .eastwoodInput()
                                .disabled(noInquiryCode)
                                .opacity(noInquiryCode ? 0.5 : 1.0)
                        }

                        fieldSection(label: language.text("common.phone"), icon: "phone") {
                            TextField(language.text("inquiry.phone.placeholder"), text: $phone)
                                .keyboardType(.phonePad).eastwoodInput()
                        }

                        fieldSection(label: language.text("common.email"), icon: "envelope") {
                            TextField(language.text("inquiry.email.placeholder"), text: $email)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled(true)
                                .eastwoodInput()
                        }

                        fieldSection(label: language.text("inquiry.details"), icon: "text.alignleft") {
                            ZStack(alignment: .topLeading) {
                                TextEditor(text: $details)
                                    .frame(height: 140)
                                    .padding(10)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .fill(EastwoodTheme.searchFill)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .stroke(EastwoodTheme.inputBorder, lineWidth: 0.5)
                                    )
                                if details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                    Text(language.text("inquiry.details.placeholder"))
                                        .font(.subheadline).foregroundStyle(.secondary.opacity(0.7))
                                        .padding(.horizontal, 16).padding(.vertical, 18)
                                        .allowsHitTesting(false)
                                }
                            }
                        }
                    }
                    .padding(16)
                    .eastwoodPanel()

                    // Errors
                    if let err = inquiryManager.actionErrorMessage, !err.isEmpty {
                        Text(err).font(.footnote).foregroundStyle(EastwoodTheme.error)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 4)
                    }

                    // Status
                    if !statusText.isEmpty {
                        Text(statusText)
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(statusText == language.text("inquiry.submitted")
                                ? EastwoodTheme.success : EastwoodTheme.error)
                    }

                    // Buttons
                    HStack(spacing: 10) {
                        Button(language.text("common.cancel")) {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            dismiss()
                        }
                        .buttonStyle(EastwoodSecondaryButtonStyle())
                        .disabled(isSubmitting)

                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            Task { await submit() }
                        } label: {
                            if isSubmitting {
                                ProgressView().tint(.white)
                            } else {
                                Text(language.text("inquiry.submit"))
                            }
                        }
                        .buttonStyle(EastwoodPrimaryButtonStyle())
                        .disabled(!isValid || isSubmitting)
                    }
                }
            }
            .padding(16)
        }
        .onAppear {
            if email.isEmpty { email = auth.userEmail }
            if let prefilledCode, !prefilledCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, code.isEmpty {
                code = prefilledCode; noInquiryCode = false
            }
        }
        .navigationTitle(language.text("inquiry.title"))
        .navigationBarTitleDisplayMode(.inline)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .eastwoodScreen()
        .navigationDestination(isPresented: $showInbox) { NativeInboxView() }
    }

    private func fieldSection<Content: View>(label: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.caption.weight(.medium)).foregroundStyle(EastwoodTheme.gold)
                Text(label).font(.footnote.weight(.medium)).foregroundStyle(.secondary)
            }
            content()
        }
    }

    private func submit() async {
        isSubmitting = true
        let ok = await inquiryManager.submitInquiry(
            token: auth.accessToken,
            inquiryCode: code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : code,
            noInquiryCode: noInquiryCode,
            details: details.trimmingCharacters(in: .whitespacesAndNewlines),
            phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
            email: email.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        statusText = ok ? language.text("inquiry.submitted") : language.text("inquiry.submitFailed")
        if ok {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            code = ""; noInquiryCode = false; details = ""; phone = ""; email = auth.userEmail; showInbox = true
        } else {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        isSubmitting = false
    }
}
