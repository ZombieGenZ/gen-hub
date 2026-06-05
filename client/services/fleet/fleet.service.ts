import type {
    FleetVehicle,
    FleetVehiclePage,
    FleetVehicleStatus,
    CreateFleetVehiclePayload,
    UpdateFleetVehiclePayload,
} from './fleet.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class FleetService {
    async create(token: string, payload: CreateFleetVehiclePayload): Promise<FleetVehicle> {
        const res = await fetch(`${API}/warehouse-manager/fleet`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<FleetVehicle>;
    }

    async list(
        token: string,
        params?: {
            warehouse_id?: string;
            status?: FleetVehicleStatus;
            limit?: number;
            offset?: number;
        },
    ): Promise<FleetVehiclePage> {
        const query = new URLSearchParams();
        if (params?.warehouse_id) query.set('warehouse_id', params.warehouse_id);
        if (params?.status) query.set('status', params.status);
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.offset) query.set('offset', String(params.offset));

        const res = await fetch(`${API}/warehouse-manager/fleet?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<FleetVehiclePage>;
    }

    async listAvailable(token: string, warehouseId: string): Promise<FleetVehicle[]> {
        const query = new URLSearchParams({ warehouse_id: warehouseId });
        const res = await fetch(`${API}/warehouse-manager/fleet/available?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<FleetVehicle[]>;
    }

    async getById(token: string, id: string): Promise<FleetVehicle> {
        const res = await fetch(`${API}/warehouse-manager/fleet/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<FleetVehicle>;
    }

    async update(token: string, id: string, payload: UpdateFleetVehiclePayload): Promise<FleetVehicle> {
        const res = await fetch(`${API}/warehouse-manager/fleet/${id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<FleetVehicle>;
    }

    async updateStatus(token: string, id: string, status: FleetVehicleStatus): Promise<FleetVehicle> {
        const res = await fetch(`${API}/warehouse-manager/fleet/${id}/status`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<FleetVehicle>;
    }

    async delete(token: string, id: string): Promise<void> {
        const res = await fetch(`${API}/warehouse-manager/fleet/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
    }

    async listAllWarehouses(token: string): Promise<{ id: string; name: string; organization_id: string; organization?: { name: string } }[]> {
        const res = await fetch(`${API}/warehouse-manager/fleet/warehouses`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<{ id: string; name: string; organization_id: string; organization?: { name: string } }[]>;
    }
}
