export interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface ChangePass {
    new_password: string;
    confirm_password: string;
    token: string;
    logout_all_devices: boolean;
}