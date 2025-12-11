import type { RegisterInput, LoginInput } from '@/types/auth/auth.type';

const API = process.env.NEXT_PUBLIC_API_URL

export class AuthService {
    
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
}