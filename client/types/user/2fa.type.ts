export interface Enable2FAResponse {
    code: string,
    message: string,
    success: true,
    data: data
}

export interface data {
    secret: string,
    qr_code_url: string,
    backup_codes: string[]
}