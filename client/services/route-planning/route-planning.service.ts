import type { RoutePlanResult } from './route-planning.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class RoutePlanningService {
    async plan(
        token: string,
        params: {
            fleet_vehicle_id: string;
            export_ids?: string[];
            departure_time?: string;
        },
    ): Promise<RoutePlanResult> {
        const res = await fetch(`${API}/warehouse-manager/route-planning/plan`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<RoutePlanResult>;
    }
}
