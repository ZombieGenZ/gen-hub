import type { RegisterInput, LoginInput, ChangePass } from '@/types/auth/auth.type';

const API = process.env.NEXT_PUBLIC_API_URL

export class AuthService {
    
    // Đăng ký
    async register(input: RegisterInput) {
        try {
            const response = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input)
            })

            const data = await response.json()

            if (data.success) {
                return data
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    // Đăng nhập
    async login(input: LoginInput) {
        try {
            const response = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input)
            })

            const data = await response.json()

            if (data.success) {
                return data
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    //Đăng xuất
    async logout(token: string, refresh_token: string) {
        try {
            const response = await fetch(`${API}/auth/logout`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ refresh_token })
            })

            const data = await response.json()

            if (data.success) {
                return data
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    // Lấy token mới
    async getNewToken(refresh_token: string) {
        try {
            const response = await fetch(`${API}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token })
            })

            const data = await response.json()

            if (data.success) {
                return data
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    //Xác minh email
    async confirmEmail(access_token: string , token: string) {
        try {
            const response = await fetch(`${API}/auth/verify-email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            })
            const data = await response.json()
            if(data.success) {
                return data
            }
        }  catch (error: any) {
            throw new Error(error.message)
        }
    }

    //Xác minh token
    async confirmToken(token: string) {
        try {
            const response = await fetch(`${API}/auth/resend-verification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            const data = await response.json()
            if(data.success) {
                return data
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    // Quên mật khẩu
    async forgotpassword(email: string) {
        try {
            const response = await fetch(`${API}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Language': 'vi',
                },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (data.success) {
                return data
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    // kiểm tra token sửa mật khẩu
    async checkToken(token: string) {
        try {
            const response = await fetch(`${API}/auth/verify-forgot-password-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Language': 'vi',
                },
                body: JSON.stringify({ token }),
            })

            const data = await response.json()
            if (data.success) {
                return data
            }
        }  catch (error: any) {
            throw new Error(error.message)
        }
    }
    
    // Thay đổi mật khẩu quên
    async changePass(req: ChangePass) {
        try {
            const res = await fetch(`${API}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Language': 'vi',
                },
                body: JSON.stringify({
                    new_password: req.new_password,
                    confirm_password: req.confirm_password,
                    logout_all_devices: true,
                    token: req.token, // gửi token cho BE
                }),
            })

            const data = await res.json()
            if (data.success) {
                return data
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    // Gửi email quên mật khẩu
    async forgotPass(email: string) {
        try {
            const res = await fetch(`${API}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Language': 'vi',
                },
                body: JSON.stringify({ email }),
            })

            const data = await res.json()

            if(data.success) {
                return data
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
    }
}