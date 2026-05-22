const API = process.env.NEXT_PUBLIC_API_URL;

export interface GpsSessionInfo {
    license_plate: string;
    status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
    expires_at: string;
    warehouse: {
        name: string;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
    } | null;
}

export interface PostLocationPayload {
    token: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
}

export interface PostLocationResult {
    recorded: boolean;
    distance_to_warehouse_m?: number;
    geofence?: 'APPROACHING' | 'ARRIVED';
}

export interface CreateGpsSessionPayload {
    license_plate: string;
    warehouse_template_id: string;
    receipt_id?: string;
    export_id?: string;
    driver_phone?: string;
}

export interface GpsSessionCreated {
    id: string;
    token: string;
    license_plate: string;
    tracking_url: string;
    expires_at: string;
}

export interface GpsActiveSession {
    id: string;
    token: string;
    license_plate: string;
    warehouse_template_id: string;
    driver_phone: string | null;
    status: string;
    expires_at: string;
    created_at: string;
    tracks: {
        id: string;
        latitude: string;
        longitude: string;
        accuracy: number | null;
        speed: number | null;
        recorded_at: string;
    }[];
}

export class GpsService {
    async getSessionInfo(token: string): Promise<GpsSessionInfo> {
        const res = await fetch(`${API}/gps/session/${token}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as any).message ?? 'Phiên GPS không hợp lệ');
        }
        return res.json() as Promise<GpsSessionInfo>;
    }

    async postLocation(payload: PostLocationPayload): Promise<PostLocationResult> {
        const res = await fetch(`${API}/gps/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as any).message ?? 'Lỗi gửi vị trí');
        }
        return res.json() as Promise<PostLocationResult>;
    }

    async createSession(
        token: string,
        payload: CreateGpsSessionPayload,
    ): Promise<GpsSessionCreated> {
        const res = await fetch(`${API}/warehouse-manager/vehicle-log/gps-session`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as any).message ?? 'Không thể tạo phiên GPS');
        }
        return res.json() as Promise<GpsSessionCreated>;
    }

    async listActiveSessions(
        token: string,
        warehouseTemplateId: string,
    ): Promise<GpsActiveSession[]> {
        const res = await fetch(
            `${API}/warehouse-manager/gps/active-sessions?warehouse_template_id=${warehouseTemplateId}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return [];
        return res.json() as Promise<GpsActiveSession[]>;
    }
}
