/**
 * Mã trả về (Response Codes)
 * Enum chứa tất cả các mã code để client dễ dàng xác định xử lý response
 * 
 * Quy ước đặt tên:
 * - Success: MODULE_ACTION_SUCCESS (ví dụ: AUTH_LOGIN_SUCCESS)
 * - Error: ERROR_TYPE (ví dụ: ERROR_VALIDATION)
 */
export enum ResponseCode {
    // ========================
    // AUTH MODULE
    // ========================
    AUTH_REGISTER_SUCCESS = 'auth.register_success',
    AUTH_LOGIN_SUCCESS = 'auth.login_success',
    AUTH_LOGIN_2FA_REQUIRED = 'auth.login_2fa_required',
    AUTH_LOGOUT_SUCCESS = 'auth.logout_success',
    AUTH_LOGOUT_ALL_SUCCESS = 'auth.logout_all_success',
    AUTH_REFRESH_TOKEN_SUCCESS = 'auth.refresh_token_success',
    AUTH_VERIFY_EMAIL_SUCCESS = 'auth.verify_email_success',
    AUTH_RESEND_VERIFICATION_SUCCESS = 'auth.resend_verification_success',
    AUTH_VERIFY_ACCESS_SUCCESS = 'auth.verify_access_success',
    AUTH_FORGOT_PASSWORD_SENT = 'auth.forgot_password_sent',
    AUTH_VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS = 'auth.verify_forgot_password_token_success',
    AUTH_RESET_PASSWORD_SUCCESS = 'auth.reset_password_success',

    // ========================
    // ACCOUNT MODULE
    // ========================
    ACCOUNT_GET_PROFILE_SUCCESS = 'account.get_profile_success',
    ACCOUNT_UPDATE_PROFILE_SUCCESS = 'account.update_profile_success',
    ACCOUNT_CHANGE_PASSWORD_SUCCESS = 'account.change_password_success',

    // ========================
    // TWO-FACTOR (2FA) MODULE
    // ========================
    TWO_FACTOR_SETUP_SUCCESS = '2fa.setup_success',
    TWO_FACTOR_VERIFY_SETUP_SUCCESS = '2fa.verify_setup_success',
    TWO_FACTOR_DISABLE_SUCCESS = '2fa.disable_success',
    TWO_FACTOR_VERIFY_LOGIN_SUCCESS = '2fa.verify_login_success',
    TWO_FACTOR_REGENERATE_BACKUP_CODES_SUCCESS = '2fa.regenerate_backup_codes_success',

    // ========================
    // WAREHOUSE TEMPLATE MODULE
    // ========================
    WAREHOUSE_TEMPLATE_CREATE_SUCCESS = 'warehouse_template.create_success',
    WAREHOUSE_TEMPLATE_LIST_SUCCESS = 'warehouse_template.list_success',
    WAREHOUSE_TEMPLATE_GET_SUCCESS = 'warehouse_template.get_success',
    WAREHOUSE_TEMPLATE_UPDATE_SUCCESS = 'warehouse_template.update_success',
    WAREHOUSE_TEMPLATE_DELETE_SUCCESS = 'warehouse_template.delete_success',
    WAREHOUSE_TEMPLATE_LAYOUT_UPDATE_SUCCESS = 'warehouse_template.layout_update_success',

    // ========================
    // ERROR CODES
    // ========================
    // Client Errors (4xx)
    ERROR_VALIDATION = 'error.validation',
    ERROR_BAD_REQUEST = 'error.bad_request',
    ERROR_UNAUTHORIZED = 'error.unauthorized',
    ERROR_FORBIDDEN = 'error.forbidden',
    ERROR_NOT_FOUND = 'error.not_found',
    ERROR_CONFLICT = 'error.conflict',
    ERROR_TOO_MANY_REQUESTS = 'error.too_many_requests',

    // Database Errors
    ERROR_DUPLICATE = 'error.duplicate',
    ERROR_INVALID_REFERENCE = 'error.invalid_reference',
    ERROR_DATABASE = 'error.database',
    ERROR_DATABASE_CONNECTION = 'error.database_connection',

    // Server Errors (5xx)
    ERROR_INTERNAL = 'error.internal',
    ERROR_SERVICE_UNAVAILABLE = 'error.service_unavailable',
    ERROR_UNKNOWN = 'error.unknown',
}
