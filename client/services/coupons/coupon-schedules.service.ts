import { CouponScheduleRequest } from "../../types/coupons/coupon-schedules.type";

const API = process.env.NEXT_PUBLIC_API_URL

export class Coupon_schedulesService {
    // Lấy tất cả coupon schedules
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

    // Lấy coupon schedule by id
    async getCouponScheduleById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/coupon-schedules/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to fetch coupon schedule')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to fetch coupon schedule", err);
        }
    }

    // Tạo coupon schedule
    async createCouponSchedule(access_token: string, couponSchedule: CouponScheduleRequest) {
        try {
            const response = await fetch(`${API}/coupon-schedules`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(couponSchedule)
            })
            if (!response.ok) {
                throw new Error('Failed to create coupon schedule')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to create coupon schedule", err);
        }
    }

    // Cập nhật coupon schedule
    async updateCouponSchedule(access_token: string, id: string, couponSchedule: CouponScheduleRequest) {
        try {
            const response = await fetch(`${API}/coupon-schedules/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(couponSchedule)
            })
            if (!response.ok) {
                throw new Error('Failed to update coupon schedule')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to update coupon schedule", err);
        }
    }

    // Xóa coupon schedule
    // Xóa coupon schedule theo id
    async deleteCouponSchedule(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/coupon-schedules/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                }
            })
            if (!response.ok) {
                throw new Error('Failed to delete coupon schedule')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to delete coupon schedule", err);
        }
    }

    // Xóa nhiều coupon schedule
    async deleteManyCouponSchedules(access_token: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/coupon-schedules/delete/many`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids })
            })
            if (!response.ok) {
                throw new Error('Failed to delete many coupon schedules')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to delete many coupon schedules", err);
        }
    }
}