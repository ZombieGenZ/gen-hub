import { authStorage } from "@/services/auth/auth-storage.service";
import type {
  WarehouseOwnerSummary,
  WarehouseOverviewData,
  TenantLease,
  ContractHistoryResponse,
  RevenueData,
  ContractStatus,
} from "./warehouse-owner.types";

const API = process.env.NEXT_PUBLIC_API_URL;

class WarehouseOwnerService {
  private headers(): HeadersInit {
    const token = authStorage.getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }

  private base(orgId: string) {
    return `${API}/organizations/${orgId}/warehouse-owner`;
  }

  async getMyWarehouses(orgId: string): Promise<WarehouseOwnerSummary[]> {
    const res = await fetch(`${this.base(orgId)}/warehouses`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch owner warehouses");
    return res.json() as Promise<WarehouseOwnerSummary[]>;
  }

  async getWarehouseOverview(
    orgId: string,
    templateId: string,
  ): Promise<WarehouseOverviewData> {
    const res = await fetch(
      `${this.base(orgId)}/warehouses/${templateId}/overview`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error("Failed to fetch warehouse overview");
    return res.json() as Promise<WarehouseOverviewData>;
  }

  async getWarehouseTenants(
    orgId: string,
    templateId: string,
  ): Promise<TenantLease[]> {
    const res = await fetch(
      `${this.base(orgId)}/warehouses/${templateId}/tenants`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error("Failed to fetch tenants");
    return res.json() as Promise<TenantLease[]>;
  }

  async getWarehouseContracts(
    orgId: string,
    templateId: string,
    params?: { status?: ContractStatus; page?: number; limit?: number },
  ): Promise<ContractHistoryResponse> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));

    const res = await fetch(
      `${this.base(orgId)}/warehouses/${templateId}/contracts?${qs.toString()}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error("Failed to fetch contracts");
    return res.json() as Promise<ContractHistoryResponse>;
  }

  async getWarehouseRevenue(
    orgId: string,
    templateId: string,
  ): Promise<RevenueData> {
    const res = await fetch(
      `${this.base(orgId)}/warehouses/${templateId}/revenue`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error("Failed to fetch revenue");
    return res.json() as Promise<RevenueData>;
  }
}

export const warehouseOwnerService = new WarehouseOwnerService();
