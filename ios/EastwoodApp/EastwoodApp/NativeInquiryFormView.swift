import SwiftUI
import UIKit

struct NativeInquiryFormView: View {
    @Environment(\.dismiss) private var dismiss
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
                if !auth.isAuthenticated {
                    EastwoodStateView(
                        systemImage: "person.crop.circle.badge.exclamationmark",
                        title: "Sign In Required",
                        message: "Please sign in before submitting inquiries."
                    )
                } else if auth.isAdmin {
                    EastwoodStateView(
                        systemImage: "lock.shield",
                        title: "Personal Users Only",
                        message: "Administrator accounts should handle inquiries from inbox/admin modules."
                    )
                } else {
                    Toggle("No inquiry code", isOn: $noInquiryCode)
                        .toggleStyle(.switch)
                        .font(.footnote)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Inquiry Code")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        TextField("Enter inquiry code", text: $code)
                            .eastwoodInput()
                            .disabled(noInquiryCode)
                            .opacity(noInquiryCode ? 0.6 : 1.0)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Phone")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        TextField("Enter phone number", text: $phone)
                            .keyboardType(.phonePad)
                            .eastwoodInput()
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        TextField("Enter email", text: $email)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                            .eastwoodInput()
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Details")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $details)
                                .frame(height: 160)
                                .padding(8)
                                .background(EastwoodTheme.panelSoft.opacity(0.85), in: RoundedRectangle(cornerRadius: 10))
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(EastwoodTheme.hairline, lineWidth: 1))
                            if details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                Text("Describe your inquiry details")
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
                            .foregroundStyle(statusText == "Submitted" ? .green : .red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    HStack(spacing: 10) {
                        Button("Cancel") {
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
                                statusText = ok ? "Submitted" : "Submit failed"
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
                                Text("Submit Inquiry")
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
            .navigationTitle("Inquiries")
            .background(EastwoodBackground())
            .eastwoodEnterMotion(id: "inquiry-form-page")
            .navigationDestination(isPresented: $showInbox) {
                NativeInboxView()
            }
        }
    }
}
