/**
 * Mã trả về (Response Codes)
 * Enum chứa tất cả các mã code để client dễ dàng xác định xử lý response
 * 
 * Quy ước đặt tên:
 * - Success: MODULE_ACTION_SUCCESS (ví dụ: AUTH_LOGIN_SUCCESS)
 * - Error: ERROR_TYPE (ví dụ: ERROR_VALIDATION)
 */
export enum ResponseCode {
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

    ACCOUNT_GET_PROFILE_SUCCESS = 'account.get_profile_success',
    ACCOUNT_UPDATE_PROFILE_SUCCESS = 'account.update_profile_success',
    ACCOUNT_CHANGE_PASSWORD_SUCCESS = 'account.change_password_success',

    TWO_FACTOR_SETUP_SUCCESS = '2fa.setup_success',
    TWO_FACTOR_VERIFY_SETUP_SUCCESS = '2fa.verify_setup_success',
    TWO_FACTOR_DISABLE_SUCCESS = '2fa.disable_success',
    TWO_FACTOR_VERIFY_LOGIN_SUCCESS = '2fa.verify_login_success',
    TWO_FACTOR_REGENERATE_BACKUP_CODES_SUCCESS = '2fa.regenerate_backup_codes_success',

    WAREHOUSE_TEMPLATE_CREATE_SUCCESS = 'warehouse_template.create_success',
    WAREHOUSE_TEMPLATE_LIST_SUCCESS = 'warehouse_template.list_success',
    WAREHOUSE_TEMPLATE_GET_SUCCESS = 'warehouse_template.get_success',
    WAREHOUSE_TEMPLATE_UPDATE_SUCCESS = 'warehouse_template.update_success',
    WAREHOUSE_TEMPLATE_DELETE_SUCCESS = 'warehouse_template.delete_success',
    WAREHOUSE_TEMPLATE_LAYOUT_UPDATE_SUCCESS = 'warehouse_template.layout_update_success',
    WAREHOUSE_TEMPLATE_IMAGE_UPLOAD_SUCCESS = 'warehouse_template.image_upload_success',
    WAREHOUSE_TEMPLATE_IMAGE_LIST_SUCCESS = 'warehouse_template.image_list_success',
    WAREHOUSE_TEMPLATE_IMAGE_DELETE_SUCCESS = 'warehouse_template.image_delete_success',
    WAREHOUSE_TEMPLATE_IMAGE_REORDER_SUCCESS = 'warehouse_template.image_reorder_success',

    ORGANIZATION_CREATE_SUCCESS = 'organization.create_success',
    ORGANIZATION_LIST_SUCCESS = 'organization.list_success',
    ORGANIZATION_GET_SUCCESS = 'organization.get_success',
    ORGANIZATION_UPDATE_SUCCESS = 'organization.update_success',
    ORGANIZATION_DELETE_SUCCESS = 'organization.delete_success',
    ORGANIZATION_TRANSFER_OWNERSHIP_SUCCESS = 'organization.transfer_ownership_success',

    // Organization Member
    ORGANIZATION_MEMBER_INVITE_SUCCESS = 'organization.member.invite_success',
    ORGANIZATION_MEMBER_INVITE_REMOVE_SUCCESS = 'organization.member.invite_remove_success',
    ORGANIZATION_MEMBER_ACCEPT_SUCCESS = 'organization.member.accept_success',
    ORGANIZATION_MEMBER_REJECT_SUCCESS = 'organization.member.reject_success',
    ORGANIZATION_MEMBER_LIST_SUCCESS = 'organization.member.list_success',
    ORGANIZATION_MEMBER_ROLE_ASSIGN_SUCCESS = 'organization.member.role_assign_success',
    ORGANIZATION_MEMBER_PERMISSION_ASSIGN_SUCCESS = 'organization.member.permission_assign_success',
    ORGANIZATION_MEMBER_REMOVE_SUCCESS = 'organization.member.remove_success',
    ORGANIZATION_MEMBER_INVITE_VERIFY_SUCCESS = 'organization.member.invite_verify_success',
    ORGANIZATION_MEMBER_LEAVE_SUCCESS = 'organization.member.leave_success',

    // Organization Role
    ORGANIZATION_ROLE_CREATE_SUCCESS = 'organization.role.create_success',
    ORGANIZATION_ROLE_LIST_SUCCESS = 'organization.role.list_success',
    ORGANIZATION_ROLE_UPDATE_SUCCESS = 'organization.role.update_success',
    ORGANIZATION_ROLE_DELETE_SUCCESS = 'organization.role.delete_success',

    // API Key
    APIKEY_CREATE_SUCCESS = 'apikey.create_success',
    APIKEY_LIST_SUCCESS = 'apikey.list_success',
    APIKEY_DETAIL_SUCCESS = 'apikey.detail_success',
    APIKEY_UPDATE_SUCCESS = 'apikey.update_success',
    APIKEY_RESET_SUCCESS = 'apikey.reset_success',
    APIKEY_DELETE_SUCCESS = 'apikey.delete_success',
    APIKEY_VERIFY_SUCCESS = 'apikey.verify_success',

    GLOBAL_NOTIFICATION_CREATE_SUCCESS = 'global_notification.create_success',
    GLOBAL_NOTIFICATION_LIST_SUCCESS = 'global_notification.list_success',
    GLOBAL_NOTIFICATION_GET_SUCCESS = 'global_notification.get_success',
    GLOBAL_NOTIFICATION_UPDATE_SUCCESS = 'global_notification.update_success',
    GLOBAL_NOTIFICATION_DELETE_SUCCESS = 'global_notification.delete_success',

    USER_NOTIFICATION_LIST_SUCCESS = 'user_notification.list_success',
    USER_NOTIFICATION_GET_SUCCESS = 'user_notification.get_success',
    USER_NOTIFICATION_SEND_SUCCESS = 'user_notification.send_success',
    USER_NOTIFICATION_MARK_READ_SUCCESS = 'user_notification.mark_read_success',
    USER_NOTIFICATION_MARK_ALL_READ_SUCCESS = 'user_notification.mark_all_read_success',

    ORG_NOTIFICATION_CREATE_SUCCESS = 'org_notification.create_success',
    ORG_NOTIFICATION_LIST_SUCCESS = 'org_notification.list_success',
    ORG_NOTIFICATION_GET_SUCCESS = 'org_notification.get_success',
    ORG_NOTIFICATION_UPDATE_SUCCESS = 'org_notification.update_success',
    ORG_NOTIFICATION_DELETE_SUCCESS = 'org_notification.delete_success',

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
