export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    turnstileToken?: string;
}

export interface LoginInput {
    email: string;
    password: string;
    turnstileToken?: string;
}

export interface ForgotPasswordInput {
    email: string;
    turnstileToken?: string;
}

export interface ChangePass {
    new_password: string;
    confirm_password: string;
    token: string;
    logout_all_devices: boolean;
}
