const API = process.env.NEXT_PUBLIC_API_URL

export class CouponService {
    // Lấy tất cả coupon người dùng
    async getAllCoupons(access_token: string) {
        try {
            const response = await fetch(`${API}/coupons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch coupons')
            }
            const data = await response.json()
            return data
        }
        catch (err) {
            console.error("Failed to fetch coupons", err);
        }
    }

    //Lấy coupon công khai
    async getPublicCoupons(access_token: string) {
        try {
            const response = await fetch(`${API}/public/coupons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch public coupons')
            }
            const data = await response.json()
            return data
        }
        catch (err) {
            console.error("Failed to fetch public coupons", err);
        }
    }
}