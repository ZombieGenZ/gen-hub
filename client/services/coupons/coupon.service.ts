import { CouponRequest } from "@/types/coupons/coupon.type"

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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch coupons');
            }
            const data = await response.json()
            return data
        }
        catch (err) {
            console.error("Failed to fetch coupons", err);
            throw err; 
        }
    }

    // Lấy coupon theo id
    async getCouponById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/coupons/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to fetch coupon')
                
            }
            const data = await response.json()
            return data
        }
        catch (err) {
            console.error("Failed to fetch coupon", err);
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

    // Lấy coupon đã lưu
    async getSavedCoupons(access_token: string) {
        try {
            const response = await fetch(`${API}/public/coupons/saved`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to fetch saved coupons')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to fetch saved coupons", err);
        }
    }

    // Lưu coupon
    async saveCoupon(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/public/coupons/${id}/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to save coupon')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to save coupon", err);
        }
    }

    // Bỏ lưu coupon
    async unsaveCoupon(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/public/coupons/${id}/save`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to unsave coupon')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to unsave coupon", err);
        }
    }

    // Kiểm tra coupon cho BookingWidget
    async validateCoupon(code: string, orderDetails: {
        warehouse_template_id?: string;
        row_template_ids?: string[];
        total_amount: number;
        duration_value: number;
        duration_unit: string;
    }) {
        try {
            const response = await fetch(`${API}/public/coupons/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, ...orderDetails })
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    is_valid: false,
                    discount_amount: 0,
                    message: errorData.message || 'Mã giảm giá không hợp lệ'
                };
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to validate coupon", err);
            return {
                is_valid: false,
                discount_amount: 0,
                message: 'Không thể kiểm tra mã giảm giá'
            };
        }
    }


    //Tạo coupon
    async createCoupon(access_token: string, coupon: CouponRequest) {
        try {
            const response = await fetch(`${API}/coupons`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(coupon)
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.errors 
                    ? `${errorData.message}: ${errorData.errors.map((e: any) => e.message).join(', ')}`
                    : errorData.message || 'Failed to create coupon';
                throw new Error(errorMessage);
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to create coupon", err);
        }
    }

    //Cập nhật coupon
    async updateCoupon(access_token: string, id: string, coupon: CouponRequest) {
        try {
            const response = await fetch(`${API}/coupons/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(coupon)
            })
            if (!response.ok) {
                throw new Error('Failed to update coupon')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to update coupon", err);
        }
    }

    //Xóa coupon
    async deleteCoupon(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/coupons/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                throw new Error('Failed to delete coupon')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to delete coupon", err);
        }
    }

    //Xóa nhiều coupon
    async deleteManyCoupons(access_token: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/coupons/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: ids })
            })
            if (!response.ok) {
                throw new Error('Failed to delete many coupons')
            }
            const data = await response.json()
            return data
        } catch (err) {
            console.error("Failed to delete many coupons", err);
        }
    }
}