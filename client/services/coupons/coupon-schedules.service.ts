const API = process.env.NEXT_PUBLIC_API_URL

export class Coupon_schedulesService {
    // Lấy tất cả coupon người dùng
    async getAllCouponSchedules(access_token: string) {
        try {
            const response = await fetch(`${API}/coupon-schedules`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to fetch coupon schedules')
            }

            const data = await response.json()
            return data

        }
        catch (err) {
            console.error("Failed to fetch coupon schedules", err);
        }
    }
}