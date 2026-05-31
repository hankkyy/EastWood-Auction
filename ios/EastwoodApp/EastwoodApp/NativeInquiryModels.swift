import Foundation

struct NativeInquiryResponse: Decodable {
    let inquiries: [NativeInquiry]
    let pendingCount: Int?
    let unreadCount: Int?
}

struct NativeInquiry: Identifiable, Decodable, Hashable {
    let id: String
    let inquiry_code: String?
    let no_inquiry_code: Bool
    let is_processed: Bool
    let is_archived: Bool
    let details: String
    let contact_phone: String
    let contact_email: String
    let created_at: String
    let messages: [NativeInquiryMessage]
}

struct NativeInquiryMessage: Identifiable, Decodable, Hashable {
    let id: String
    let sender_role: String
    let body: String
    let is_read: Bool
    let created_at: String
}
