import { CreateOrderRequest, Order, CreateOrderResponse } from '@/types/checkout/checkout.type';

const API = process.env.NEXT_PUBLIC_API_URL;

export class OrderService {
    
    /**
     * Tạo đơn thuê mới
     * @param token Token truy cập
     * @param data Dữ liệu đơn thuê
     * @returns Thông tin đơn thuê sau khi tạo
     */
    async createOrder(token: string, data: CreateOrderRequest): Promise<CreateOrderResponse> {
        try {
            const response = await fetch(`${API}/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể tạo đơn thuê');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("Lỗi khi tạo đơn thuê:", err);
            throw err;
        }
    }

    /**
     * Lấy thông tin đơn thuê theo ID
     * @param token Token truy cập
     * @param orderId ID đơn thuê
     * @returns Thông tin đơn thuê
     */
    async getOrderById(token: string, orderId: string): Promise<Order> {
        try {
            const response = await fetch(`${API}/orders/${orderId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy thông tin đơn thuê');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("Lỗi khi lấy thông tin đơn thuê:", err);
            throw err;
        }
    }

    /**
     * Lấy danh sách đơn thuê của user
     * @param token Token truy cập
     * @param params Tham số lọc
     * @returns Danh sách đơn thuê
     */
    async getMyOrders(token: string, params: {
        status?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<{ items: Order[]; total: number; hasMore: boolean }> {
        try {
            const query = new URLSearchParams();
            if (params.status) query.append('status', params.status);
            if (params.page) query.append('page', String(params.page));
            if (params.limit) query.append('limit', String(params.limit));

            const response = await fetch(`${API}/orders/my?${query.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách đơn thuê');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("Lỗi khi lấy danh sách đơn thuê:", err);
            throw err;
        }
    }

    /**
     * Hủy đơn thuê
     * @param token Token truy cập
     * @param orderId ID đơn thuê
     * @param reason Lý do hủy
     * @returns Kết quả hủy đơn
     */
    async cancelOrder(token: string, orderId: string, reason?: string): Promise<void> {
        try {
            const response = await fetch(`${API}/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể hủy đơn thuê');
            }
        } catch (err) {
            console.error("Lỗi khi hủy đơn thuê:", err);
            throw err;
        }
    }

    /**
     * Kiểm tra trạng thái thanh toán
     * @param token Token truy cập
     * @param orderId ID của đơn thuê
     * @returns Trạng thái thanh toán
     */
    async checkPaymentStatus(token: string, orderId: string): Promise<{
        status: 'pending' | 'processing' | 'paid' | 'failed';
        paid_at?: string;
        transaction_id?: string;
    }> {
        try {
            const response = await fetch(`${API}/orders/${orderId}/payment-status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể kiểm tra trạng thái thanh toán');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("Lỗi khi kiểm tra trạng thái thanh toán:", err);
            throw err;
        }
    }

    /**
     * Lấy QR code SePay cho thanh toán
     * @param token Token truy cập
     * @param orderId ID của đơn thuê
     * @returns Thông tin QR code thanh toán
     */
    async getSePayQRCode(token: string, orderId: string): Promise<{
        qr_code_url: string;
        qr_content: string;
        amount: number;
        expire_at: string;
    }> {
        try {
            const response = await fetch(`${API}/orders/${orderId}/sepay-qr`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy mã QR thanh toán');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("Lỗi khi lấy mã QR thanh toán:", err);
            throw err;
        }
    }
}
