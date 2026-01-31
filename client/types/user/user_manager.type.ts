export interface UserManager {
    id: string,
    name: string,
    email: string,
    email_confirmed: boolean,
    is_verified: boolean,
    is_banned: boolean,
    banned_end: string | null,
    is_online: boolean,
    last_online: string | null,
    created_at: string,
    warning_count: number
}