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
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(language.text("inquiry.title"))
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(EastwoodTheme.ink)
                    Text(language.text("inquiry.pageDescription"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
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
                    Toggle(language.text("inquiry.noCode"), isOn: $noInquiryCode)
                        .toggleStyle(.switch)
                        .font(.footnote)

                    VStack(alignment: .leading, spacing: 6) {
                        Text(language.text("inquiry.code"))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        TextField(language.text("inquiry.code.placeholder"), text: $code)
                            .eastwoodInput()
                            .disabled(noInquiryCode)
                            .opacity(noInquiryCode ? 0.6 : 1.0)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text(language.text("common.phone"))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        TextField(language.text("inquiry.phone.placeholder"), text: $phone)
                            .keyboardType(.phonePad)
                            .eastwoodInput()
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text(language.text("common.email"))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        TextField(language.text("inquiry.email.placeholder"), text: $email)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                            .eastwoodInput()
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text(language.text("inquiry.details"))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $details)
                                .frame(height: 160)
                                .padding(8)
                                .background(Color.white, in: RoundedRectangle(cornerRadius: 10))
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(EastwoodTheme.hairline, lineWidth: 1))
                            if details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                Text(language.text("inquiry.details.placeholder"))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary.opacity(0.8))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 16)
                                    .allowsHitTesting(false)
                            }
                        }
                    }

                    if let actionError = inquiryManager.actionErrorMessage, !actionError.isEmpty {
                        Text(actionError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if !statusText.isEmpty {
                        Text(statusText)
                            .font(.footnote)
                            .foregroundStyle(statusText == language.text("inquiry.submitted") ? .green : .red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    HStack(spacing: 10) {
                        Button(language.text("common.cancel")) {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            dismiss()
                        }
                        .buttonStyle(EastwoodSecondaryButtonStyle())
                        .disabled(isSubmitting)

                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            Task {
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
                                } else {
                                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                                }
                                if ok {
                                    code = ""
                                    noInquiryCode = false
                                    details = ""
                                    phone = ""
                                    email = auth.userEmail
                                    showInbox = true
                                }
                                isSubmitting = false
                            }
                        } label: {
                            if isSubmitting {
                                ProgressView()
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
                if email.isEmpty {
                    email = auth.userEmail
                }
                if let prefilledCode, !prefilledCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, code.isEmpty {
                    code = prefilledCode
                    noInquiryCode = false
                }
            }
            .navigationTitle(language.text("inquiry.title"))
            .navigationBarTitleDisplayMode(.inline)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .eastwoodScreen()
            .eastwoodEnterMotion(id: "inquiry-form-page")
            .navigationDestination(isPresented: $showInbox) {
                NativeInboxView()
            }
        }
    }
}
