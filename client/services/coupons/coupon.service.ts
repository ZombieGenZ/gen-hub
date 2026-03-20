import { CouponRequest } from "@/types/coupons/coupon.type"

const API = process.env.NEXT_PUBLIC_API_URL

export class CouponService {
    /**
     * Lấy tất cả coupon người dùng
     * @param access_token Token truy cập
     * @returns Danh sách coupon
     */
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

    /**
     * Lấy coupon theo id
     * @param access_token Token truy cập
     * @param id ID của coupon
     * @returns Thông tin coupon
     */
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
    
    /**
     * Lấy coupon công khai
     * @param access_token Token truy cập
     * @returns Danh sách coupon công khai
     */
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

    /**
     * Lấy coupon đã lưu
     * @param access_token Token truy cập
     * @returns Danh sách coupon đã lưu
     */
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

    /**
     * Lưu coupon
     * @param access_token Token truy cập
     * @param id ID của coupon
     * @returns Kết quả lưu coupon
     */
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

    /**
     * Bỏ lưu coupon
     * @param access_token Token truy cập
     * @param id ID của coupon
     * @returns Kết quả bỏ lưu coupon
     */
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

    /**
     * Kiểm tra coupon cho BookingWidget
     * @param code Mã giảm giá
     * @param orderDetails Thông tin đơn hàng
     * @param access_token Token truy cập
     * @returns Kết quả kiểm tra coupon
     */
    async validateCoupon(code: string, orderDetails: {
        warehouse_template_ids?: string[];
        row_template_ids?: string[];
        addon_ids?: string[];
        rental_duration_tier_id: string;    
        type: 'NEW_CONTRACT' | 'RENEWAL';
    }, access_token: string) {
        try {
            const response = await fetch(`${API}/public/coupons/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`,
                },
                body: JSON.stringify({ 
                    code, 
                    warehouse_template_ids: orderDetails.warehouse_template_ids,
                    row_template_ids: orderDetails.row_template_ids,
                    addon_ids: orderDetails.addon_ids,
                    rental_duration_tier_id: orderDetails.rental_duration_tier_id,
                    type: orderDetails.type,
                })
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    is_valid: false,
                    discount_amount: 0,
                    message: errorData.message || 'Mã giảm giá không hợp lệ'
                };
            }
            const responseData = await response.json();
            const payload = responseData?.data ?? responseData;

            if (typeof payload?.is_valid === 'boolean') {
                return payload;
            }

            if (typeof payload?.isValid === 'boolean') {
                return {
                    is_valid: payload.isValid,
                    discount_amount: payload.discount_info?.estimated_discount ?? 0,
                    message: payload.message || payload.error || responseData.message || (payload.isValid ? 'Coupon hợp lệ' : 'Mã giảm giá không hợp lệ'),
                    ...payload,
                };
            }

            return {
                is_valid: false,
                discount_amount: 0,
                message: 'Không thể đọc dữ liệu coupon từ máy chủ',
            };
        } catch (err) {
            console.error("Failed to validate coupon", err);
            return {
                is_valid: false,
                discount_amount: 0,
                message: 'Không thể kiểm tra mã giảm giá'
            };
        }
    }


    /**
     * Tạo coupon
     * @param access_token Token truy cập
     * @param coupon Dữ liệu coupon cần tạo
     * @returns Thông tin coupon sau khi tạo
     */
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

    /**
     * Cập nhật coupon
     * @param access_token Token truy cập
     * @param id ID của coupon
     * @param coupon Dữ liệu coupon cần cập nhật
     * @returns Thông tin coupon sau khi cập nhật
     */
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

    /**
     * Xóa coupon
     * @param access_token Token truy cập
     * @param id ID của coupon
     * @returns Kết quả xóa coupon
     */
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

    /**
     * Xóa nhiều coupon
     * @param access_token Token truy cập
     * @param ids Danh sách ID coupon
     * @returns Kết quả xóa nhiều coupon
     */
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