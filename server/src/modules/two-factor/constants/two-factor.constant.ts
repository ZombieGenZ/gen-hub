export const TWO_FACTOR_MODULE = 'two-factor';

export const TWO_FACTOR_ACTIONS = {
    SETUP_2FA: 'setup_2fa',
    ENABLE_2FA: 'enable_2fa',
    DISABLE_2FA: 'disable_2fa',
    VERIFY_FAILED: 'verify_2fa_failed',
    VERIFY_LOGIN: 'verify_2fa_login',
    SEND_EMAIL_FAILED: 'send_email_failed',
} as const;
