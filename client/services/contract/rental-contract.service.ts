import { authStorage } from '@/services/auth/auth-storage.service';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface SendDocusignRequest {
    returnUrl: string;
}

export interface SendDocusignResponse {
    signingUrl: string;
}

export class RentalContractService {
    /**
     * Gửi hợp đồng qua DocuSign và lấy URL ký
     * @param orgId ID của tổ chức
     * @param contractId ID của hợp đồng
     * @param returnUrl URL quay lại sau khi ký
     */
    async sendToDocusign(orgId: string, contractId: string, returnUrl: string): Promise<SendDocusignResponse> {
        try {
            const token = authStorage.getAccessToken();
            if (!token) throw new Error('Unauthorized');

            const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${contractId}/send-docusign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ returnUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể khởi tạo DocuSign');
            }

            const result = await response.json();
            return result.data;
        } catch (err) {
            console.error("Lỗi khi gửi DocuSign:", err);
            throw err;
        }
    }
}
