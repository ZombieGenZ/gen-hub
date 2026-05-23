import type {
    VehicleLog,
    VehicleLogPage,
    CreateVehicleLogPayload,
    VehicleLookupResult,
    VehicleStats,
    VehicleLogStatus,
    VehiclePurpose,
    OcrPlateResult,
    OcrPlateQuickResult,
} from './vehicle-log.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class VehicleLogService {
    async create(token: string, payload: CreateVehicleLogPayload): Promise<VehicleLog> {
        const res = await fetch(`${API}/warehouse-manager/vehicle-log`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<VehicleLog>;
    }

    async list(
        token: string,
        params?: {
            warehouse_template_id?: string;
            license_plate?: string;
            status?: VehicleLogStatus;
            purpose?: VehiclePurpose;
            date?: string;
            limit?: number;
            offset?: number;
        },
    ): Promise<VehicleLogPage> {
        const query = new URLSearchParams();
        if (params?.warehouse_template_id) query.set('warehouse_template_id', params.warehouse_template_id);
        if (params?.license_plate) query.set('license_plate', params.license_plate);
        if (params?.status) query.set('status', params.status);
        if (params?.purpose) query.set('purpose', params.purpose);
        if (params?.date) query.set('date', params.date);
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.offset) query.set('offset', String(params.offset));

        const res = await fetch(`${API}/warehouse-manager/vehicle-log?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<VehicleLogPage>;
    }

    async listActive(token: string, warehouseTemplateId?: string): Promise<VehicleLog[]> {
        const query = new URLSearchParams();
        if (warehouseTemplateId) query.set('warehouse_template_id', warehouseTemplateId);
        const res = await fetch(`${API}/warehouse-manager/vehicle-log/active?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<VehicleLog[]>;
    }

    async getStats(token: string, warehouseTemplateId?: string): Promise<VehicleStats> {
        const query = new URLSearchParams();
        if (warehouseTemplateId) query.set('warehouse_template_id', warehouseTemplateId);
        const res = await fetch(`${API}/warehouse-manager/vehicle-log/stats?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<VehicleStats>;
    }

    async lookup(token: string, licensePlate: string, warehouseTemplateId: string): Promise<VehicleLookupResult> {
        const query = new URLSearchParams({ license_plate: licensePlate, warehouse_template_id: warehouseTemplateId });
        const res = await fetch(`${API}/warehouse-manager/vehicle-log/lookup?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<VehicleLookupResult>;
    }

    async recordExit(token: string, id: string): Promise<VehicleLog> {
        const res = await fetch(`${API}/warehouse-manager/vehicle-log/${id}/exit`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<VehicleLog>;
    }

    async delete(token: string, id: string): Promise<void> {
        const res = await fetch(`${API}/warehouse-manager/vehicle-log/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
    }

    async ocrPlate(token: string, formData: FormData): Promise<OcrPlateResult> {
        const res = await fetch(`${API}/warehouse-manager/vehicle-log/ocr-plate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<OcrPlateResult>;
    }

    async ocrPlateQuick(token: string, formData: FormData): Promise<OcrPlateQuickResult> {
        const res = await fetch(`${API}/warehouse-manager/vehicle-log/ocr-plate/quick`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<OcrPlateQuickResult>;
    }
}
