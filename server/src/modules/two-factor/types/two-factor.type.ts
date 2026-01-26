export interface ITwoFactorUser {
    id: string;
    name: string;
    email: string | null;
    email_confirmed: boolean;
    is_verified: boolean | null;
    two_factor_enabled: boolean;
    two_factor_token: string | null;
    language: string;
    created_at: Date;
    is_banned: boolean;
    banned_end: Date | null;
}

export interface ITwoFactorSetupResult {
    message: string;
    secret: string;
    qr_code_url: string;
}

export interface ISanitizedUser {
    id: string;
    name: string;
    email: string | null;
    email_confirmed: boolean;
    is_verified: boolean | null;
    two_factor_enabled: boolean;
    language: string;
    created_at: Date;
}
