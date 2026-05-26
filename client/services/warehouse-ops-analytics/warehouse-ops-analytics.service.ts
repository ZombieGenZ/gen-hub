const API = process.env.NEXT_PUBLIC_API_URL;

export interface OpsOverview {
  vehicle: { inside: number; entered_today: number; exited_today: number };
  dock: {
    total_scheduled: number;
    by_status: Record<string, number>;
    completion_rate: number;
    no_show_rate: number;
  };
  gps: { active_sessions: number };
}

export interface VehicleTrendPoint {
  date: string;
  entered: number;
  exited: number;
}

export interface DockSlot {
  dock_number: number;
  status: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  license_plate: string;
}

export interface DockStat {
  dock_number: number;
  total: number;
  completed: number;
  no_show: number;
  slots: DockSlot[];
}

export interface DockStatsResult {
  warehouse_name: string;
  date: string;
  docks: DockStat[];
}

export class WarehouseOpsAnalyticsService {
  async getOverview(token: string, warehouseTemplateId: string): Promise<OpsOverview> {
    const res = await fetch(
      `${API}/warehouse-manager/ops-analytics/overview?warehouse_template_id=${warehouseTemplateId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getVehicleTrend(
    token: string,
    warehouseTemplateId: string,
    days = 7,
  ): Promise<VehicleTrendPoint[]> {
    const res = await fetch(
      `${API}/warehouse-manager/ops-analytics/vehicle-trend?warehouse_template_id=${warehouseTemplateId}&days=${days}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getDockStats(
    token: string,
    warehouseTemplateId: string,
    date?: string,
  ): Promise<DockStatsResult> {
    const query = new URLSearchParams({ warehouse_template_id: warehouseTemplateId });
    if (date) query.set('date', date);
    const res = await fetch(
      `${API}/warehouse-manager/ops-analytics/dock-stats?${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
