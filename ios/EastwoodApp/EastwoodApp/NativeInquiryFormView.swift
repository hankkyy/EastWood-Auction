import SwiftUI
import UIKit

struct NativeInquiryFormView: View {
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var inquiryManager = NativeInquiryManager()

    @State private var code = ""
    @State private var details = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var statusText = ""
    @State private var isSubmitting = false

    private var isValid: Bool {
        !details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && email.contains("@")
    }

    var body: some View {
        NavigationStack {
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
                    TextField("Inquiry code (optional)", text: $code)
                        .eastwoodInput()

                    TextField("Phone", text: $phone)
                        .keyboardType(.phonePad)
                        .eastwoodInput()

                    TextField("Email", text: $email)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .eastwoodInput()

                    TextEditor(text: $details)
                        .frame(height: 160)
                        .padding(8)
                        .background(EastwoodTheme.panelSoft.opacity(0.85), in: RoundedRectangle(cornerRadius: 10))
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(EastwoodTheme.hairline, lineWidth: 1))

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

                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        Task {
                            isSubmitting = true
                            let ok = await inquiryManager.submitInquiry(
                                token: auth.accessToken,
                                inquiryCode: code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : code,
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
                                details = ""
                                phone = ""
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

                Spacer()
            }
            .padding(16)
            .onAppear {
                if email.isEmpty {
                    email = auth.userEmail
                }
            }
            .navigationTitle("Inquiries")
            .background(EastwoodBackground())
            .eastwoodEnterMotion(id: "inquiry-form-page")
        }
    }
}
