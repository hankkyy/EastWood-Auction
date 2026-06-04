import Foundation

@MainActor
final class NativeInquiryManager: ObservableObject {
    @Published var inquiries: [NativeInquiry] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var actionErrorMessage: String?

    func load(token: String) async {
        guard let api = NativeAPIClient() else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let data = try await api.requestJSON(path: "api/inquiries", token: token, retries: 2)
            let decoded = try JSONDecoder().decode(NativeInquiryResponse.self, from: data)
            inquiries = decoded.inquiries
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            errorMessage = AppErrorPresenter.message(for: error)
        }
    }

    func submitInquiry(token: String, inquiryCode: String?, noInquiryCode: Bool, details: String, phone: String, email: String) async -> Bool {
        guard let api = NativeAPIClient() else { return false }
        actionErrorMessage = nil
        do {
            _ = try await api.requestJSON(
                path: "api/inquiries",
                method: "POST",
                token: token,
                body: [
                    "inquiryCode": inquiryCode ?? "",
                    "noInquiryCode": noInquiryCode,
                    "details": details,
                    "contactPhone": phone,
                    "contactEmail": email,
                ],
                retries: 1
            )
            return true
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            actionErrorMessage = AppErrorPresenter.message(for: error)
            return false
        }
    }

    func sendMessage(token: String, inquiryId: String, body: String) async -> Bool {
        guard let api = NativeAPIClient() else { return false }
        actionErrorMessage = nil
        do {
            _ = try await api.requestJSON(
                path: "api/inquiry-messages",
                method: "POST",
                token: token,
                body: ["inquiryId": inquiryId, "body": body],
                retries: 1
            )
            return true
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            actionErrorMessage = AppErrorPresenter.message(for: error)
            return false
        }
    }

    func markRead(token: String, inquiryIds: [String]) async {
        guard let api = NativeAPIClient(), !inquiryIds.isEmpty else { return }
        actionErrorMessage = nil
        do {
            _ = try await api.requestJSON(
                path: "api/inquiry-messages",
                method: "PATCH",
                token: token,
                body: ["inquiryIds": inquiryIds],
                retries: 1
            )

            let idSet = Set(inquiryIds)
            inquiries = inquiries.map { inquiry in
                guard idSet.contains(inquiry.id) else { return inquiry }
                let updated = inquiry.messages.map { msg in
                    msg.sender_role == "admin"
                    ? NativeInquiryMessage(id: msg.id, sender_role: msg.sender_role, body: msg.body, is_read: true, created_at: msg.created_at)
                    : msg
                }
                return NativeInquiry(
                    id: inquiry.id,
                    inquiry_code: inquiry.inquiry_code,
                    no_inquiry_code: inquiry.no_inquiry_code,
                    is_processed: inquiry.is_processed,
                    is_archived: inquiry.is_archived,
                    details: inquiry.details,
                    contact_phone: inquiry.contact_phone,
                    contact_email: inquiry.contact_email,
                    created_at: inquiry.created_at,
                    messages: updated
                )
            }
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            return
        }
    }

    func updateInquiryStatus(token: String, inquiryId: String, isProcessed: Bool? = nil, isArchived: Bool? = nil) async -> Bool {
        guard let api = NativeAPIClient() else { return false }
        actionErrorMessage = nil
        var body: [String: Any] = ["id": inquiryId]
        if let isProcessed { body["isProcessed"] = isProcessed }
        if let isArchived { body["isArchived"] = isArchived }
        if body.count == 1 { return false }

        actionErrorMessage = nil
        do {
            _ = try await api.requestJSON(
                path: "api/inquiries",
                method: "PATCH",
                token: token,
                body: body,
                retries: 1
            )
            return true
        } catch {
            if case APIClientError.unauthorized = error {
                NotificationCenter.default.post(name: .eastwoodAuthExpired, object: nil)
            }
            actionErrorMessage = AppErrorPresenter.message(for: error)
            return false
        }
    }
}
