import { CreateInsuranceRequest, UpdateInsuranceRequest } from "@/types/insurance/Insurance.types";

const API = process.env.NEXT_PUBLIC_API_URL

export class IsuranceService {

    // Lấy danh sách bảo hiểm
    async getAllInsurance(access_token: string) {
        try {
            const response = await fetch(`${API}/insurances`, {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch Insurance');
            }

            const data = await response.json();
            return data
        }
        catch(err) {
            console.error("Failed to fetch Insurance", err);
        }
    }

    // Lấy bảo hiển theo active
    async getActiveInsurance(access_token: string) {
        try {
            const response = await fetch(`${API}/insurances/active`, {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch Active Insurance');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch Active Insurance", err);
        }
    }

    // Lấy bảo hiểm công khai cho BookingWidget (Không cần auth)
    async getPublicActiveInsurance() {
        try {
            const response = await fetch(`${API}/public/insurances/active`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch Public Active Insurance');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch Public Active Insurance", err);
        }
    }


    // Lấy bảo hiểm theo ID
    async getInsuranceById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/insurances/${id}`, {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!response.ok) {
                throw new Error('Failed to fetch Insurance by ID');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch Insurance by ID", err);
        }
    }

    // Tạo bảo hiểm
    async createInsurance(access_token: string, request: CreateInsuranceRequest) {
        try {
            const response = await fetch(`${API}/insurances`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create Insurance');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to create Insurance", err);
        }
    }

    // Cập nhật bảo hiểm
    async updateInsurance(access_token: string, id: string, request: UpdateInsuranceRequest) {
        try {
            const response = await fetch(`${API}/insurances/${id}`, {
                method: "PUT",
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update Insurance');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to update Insurance", err);
        }
    }

    // Xóa bảo hiểm
    async deleteInsurance(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/insurances/${id}`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete Insurance');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to delete Insurance", err);
        }
    }

    // Xóa nhiều bảo hiểm
    async deleteManyInsurances(access_token: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/insurances/delete/many`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: ids })
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete many Insurances');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to delete many Insurances", err);
            throw err;
        }
    }
}