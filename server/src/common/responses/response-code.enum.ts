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
    AUTH_LOGIN_DATABASE_PANEL_SUCCESS = 'auth.login_database_panel_success',
    AUTH_LOGIN_FEATURE_FLAG_PANEL_SUCCESS = 'auth.login_feature_flag_panel_success',
    AUTH_LOGIN_RESOURCES_PANEL_SUCCESS = 'auth.login_resources_panel_success',
    AUTH_LOGIN_ADMIN_PANEL_SUCCESS = 'auth.login_admin_panel_success',

    // Analytics
    ANALYTICS_TRAFFIC_SUCCESS = 'analytics.traffic_success',

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

    // Organization Update Request
    ORGANIZATION_UPDATE_REQUEST_CREATE_SUCCESS = 'organization_update_request.create_success',
    ORGANIZATION_UPDATE_REQUEST_LIST_SUCCESS = 'organization_update_request.list_success',
    ORGANIZATION_UPDATE_REQUEST_GET_SUCCESS = 'organization_update_request.get_success',
    ORGANIZATION_UPDATE_REQUEST_APPROVE_SUCCESS = 'organization_update_request.approve_success',
    ORGANIZATION_UPDATE_REQUEST_REJECT_SUCCESS = 'organization_update_request.reject_success',

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
    ORGANIZATION_PERMISSION_LIST_SUCCESS = 'organization.permission.list_success',

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

    // Warehouse
    WAREHOUSE_LIST_SUCCESS = 'warehouse.list_success',
    WAREHOUSE_READ_SUCCESS = 'warehouse.read_success',
    WAREHOUSE_LAYOUT_SUCCESS = 'warehouse.layout_success',
    WAREHOUSE_UPDATE_SUCCESS = 'warehouse.update_success',
    WAREHOUSE_DELETE_SUCCESS = 'warehouse.delete_success',
    WAREHOUSE_RACKS_SUCCESS = 'warehouse.racks_success',
    WAREHOUSE_SHELVES_SUCCESS = 'warehouse.shelves_success',
    WAREHOUSE_BLOCKS_SUCCESS = 'warehouse.blocks_success',

    // Rental Contract
    RENTAL_CONTRACT_CREATE_SUCCESS = 'rental_contract.create_success',
    RENTAL_CONTRACT_LIST_SUCCESS = 'rental_contract.list_success',
    RENTAL_CONTRACT_READ_SUCCESS = 'rental_contract.read_success',
    RENTAL_CONTRACT_UPDATE_SUCCESS = 'rental_contract.update_success',
    RENTAL_CONTRACT_DELETE_SUCCESS = 'rental_contract.delete_success',

    // Province (Public API)
    PROVINCE_LIST_SUCCESS = 'province.list_success',
    PROVINCE_GET_SUCCESS = 'province.get_success',

    // Ward (Public API)
    WARD_LIST_SUCCESS = 'ward.list_success',
    WARD_GET_SUCCESS = 'ward.get_success',

    // Partner
    PARTNER_CREATE_SUCCESS = 'partner.create_success',
    PARTNER_LIST_SUCCESS = 'partner.list_success',
    PARTNER_GET_SUCCESS = 'partner.get_success',
    PARTNER_UPDATE_SUCCESS = 'partner.update_success',
    PARTNER_DELETE_SUCCESS = 'partner.delete_success',

    // Product
    PRODUCT_CREATE_SUCCESS = 'product.create_success',
    PRODUCT_LIST_SUCCESS = 'product.list_success',
    PRODUCT_GET_SUCCESS = 'product.get_success',
    PRODUCT_UPDATE_SUCCESS = 'product.update_success',
    PRODUCT_DELETE_SUCCESS = 'product.delete_success',

    // Batch
    BATCH_CREATE_SUCCESS = 'batch.create_success',
    BATCH_LIST_SUCCESS = 'batch.list_success',
    BATCH_GET_SUCCESS = 'batch.get_success',
    BATCH_UPDATE_SUCCESS = 'batch.update_success',
    BATCH_DELETE_SUCCESS = 'batch.delete_success',

    // Amenity
    AMENITY_CREATE_SUCCESS = 'amenity.create_success',
    AMENITY_LIST_SUCCESS = 'amenity.list_success',
    AMENITY_GET_SUCCESS = 'amenity.get_success',
    AMENITY_UPDATE_SUCCESS = 'amenity.update_success',
    AMENITY_DELETE_SUCCESS = 'amenity.delete_success',

    // Row Template
    ROW_TEMPLATE_CREATE_SUCCESS = 'row_template.create_success',
    ROW_TEMPLATE_LIST_SUCCESS = 'row_template.list_success',
    ROW_TEMPLATE_GET_SUCCESS = 'row_template.get_success',
    ROW_TEMPLATE_UPDATE_SUCCESS = 'row_template.update_success',
    ROW_TEMPLATE_DELETE_SUCCESS = 'row_template.delete_success',

    // Rack Template
    RACK_TEMPLATE_CREATE_SUCCESS = 'rack_template.create_success',
    RACK_TEMPLATE_LIST_SUCCESS = 'rack_template.list_success',
    RACK_TEMPLATE_GET_SUCCESS = 'rack_template.get_success',
    RACK_TEMPLATE_UPDATE_SUCCESS = 'rack_template.update_success',
    RACK_TEMPLATE_DELETE_SUCCESS = 'rack_template.delete_success',

    // Shelf Template
    SHELF_TEMPLATE_CREATE_SUCCESS = 'shelf_template.create_success',
    SHELF_TEMPLATE_LIST_SUCCESS = 'shelf_template.list_success',
    SHELF_TEMPLATE_GET_SUCCESS = 'shelf_template.get_success',
    SHELF_TEMPLATE_UPDATE_SUCCESS = 'shelf_template.update_success',
    SHELF_TEMPLATE_DELETE_SUCCESS = 'shelf_template.delete_success',

    // Block Template
    BLOCK_TEMPLATE_CREATE_SUCCESS = 'block_template.create_success',
    BLOCK_TEMPLATE_LIST_SUCCESS = 'block_template.list_success',
    BLOCK_TEMPLATE_GET_SUCCESS = 'block_template.get_success',
    BLOCK_TEMPLATE_UPDATE_SUCCESS = 'block_template.update_success',
    BLOCK_TEMPLATE_DELETE_SUCCESS = 'block_template.delete_success',

    // Payment
    PAYMENT_LIST_SUCCESS = 'payment.list_success',
    PAYMENT_GET_SUCCESS = 'payment.get_success',

    // Refund Request
    REFUND_REQUEST_LIST_SUCCESS = 'refund_request.list_success',
    REFUND_REQUEST_READ_SUCCESS = 'refund_request.read_success',
    REFUND_REQUEST_ACCEPT_SUCCESS = 'refund_request.accept_success',
    REFUND_REQUEST_REJECT_SUCCESS = 'refund_request.reject_success',
    REFUND_REQUEST_CHANGE_SUCCESS = 'refund_request.change_success',
    REFUND_REQUEST_DELETE_SUCCESS = 'refund_request.delete_success',

    // Organization Chat
    ORG_CHAT_TOKEN_SUCCESS = 'org_chat.token_success',
    ORG_CHAT_MESSAGES_SUCCESS = 'org_chat.messages_success',
    ORG_CHAT_SYNC_SUCCESS = 'org_chat.sync_success',
    ORG_CHAT_DELETE_SUCCESS = 'org_chat.delete_success',
    ORG_CHAT_CALLS_SUCCESS = 'org_chat.calls_success',
    ORG_CHAT_CALL_SUCCESS = 'org_chat.call_success',
    ORG_CHAT_CALL_STARTED = 'org_chat.call_started',
    ORG_CHAT_CALL_JOINED = 'org_chat.call_joined',
    ORG_CHAT_CALL_LEFT = 'org_chat.call_left',
    ORG_CHAT_CALL_ENDED = 'org_chat.call_ended',

    // Permission
    PERMISSION_LIST_SUCCESS = 'permission.list_success',

    // Role
    ROLE_CREATE_SUCCESS = 'role.create_success',
    ROLE_LIST_SUCCESS = 'role.list_success',
    ROLE_GET_SUCCESS = 'role.get_success',
    ROLE_UPDATE_SUCCESS = 'role.update_success',
    ROLE_DELETE_SUCCESS = 'role.delete_success',

    // Client Errors (4xx)
    ERROR_VALIDATION = 'error.validation',
    ERROR_BAD_REQUEST = 'error.bad_request',
    ERROR_UNAUTHORIZED = 'error.unauthorized',
    ERROR_FORBIDDEN = 'error.forbidden',
    ERROR_NOT_FOUND = 'error.not_found',
    ERROR_CONFLICT = 'error.conflict',
    ERROR_TOO_MANY_REQUESTS = 'error.too_many_requests',
    ERROR_ACCOUNT_LOCKED = 'error.account_locked',
    ERROR_ACCOUNT_LOCKED_PERMANENT = 'error.account_locked_permanent',

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
