import Foundation

struct SupabaseAuthResponse: Decodable {
    let access_token: String
    let token_type: String
    let user: SupabaseUser
}

struct SupabaseUser: Decodable {
    let id: String
    let email: String?
}

struct FavoriteRow: Decodable {
    let artwork_id: String
    let created_at: String
}

struct FavoriteListResponse: Decodable {
    let favorites: [FavoriteRow]
}

struct MobileMeResponse: Decodable {
    let userId: String
    let role: String
    let isAdmin: Bool
}
