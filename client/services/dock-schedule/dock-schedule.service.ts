import type {
  DockSchedule,
  DockSchedulePage,
  DockSlotsResult,
  CreateDockSchedulePayload,
  DockScheduleStatus,
} from './dock-schedule.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class DockScheduleService {
  async create(token: string, payload: CreateDockSchedulePayload): Promise<DockSchedule> {
    const res = await fetch(`${API}/warehouse-manager/dock-schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSchedule>;
  }

  async list(
    token: string,
    params?: {
      warehouse_template_id?: string;
      organization_id?: string;
      date?: string;
      dock_number?: number;
      status?: DockScheduleStatus;
      license_plate?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<DockSchedulePage> {
    const query = new URLSearchParams();
    if (params?.warehouse_template_id) query.set('warehouse_template_id', params.warehouse_template_id);
    if (params?.organization_id) query.set('organization_id', params.organization_id);
    if (params?.date) query.set('date', params.date);
    if (params?.dock_number) query.set('dock_number', String(params.dock_number));
    if (params?.status) query.set('status', params.status);
    if (params?.license_plate) query.set('license_plate', params.license_plate);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const res = await fetch(`${API}/warehouse-manager/dock-schedule?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSchedulePage>;
  }

  async getSlots(token: string, warehouseTemplateId: string, date: string): Promise<DockSlotsResult> {
    const query = new URLSearchParams({ warehouse_template_id: warehouseTemplateId, date });
    const res = await fetch(`${API}/warehouse-manager/dock-schedule/slots?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSlotsResult>;
  }

  async listMy(
    token: string,
    organizationId: string,
    params?: { warehouse_template_id?: string; date?: string; status?: DockScheduleStatus },
  ): Promise<DockSchedulePage> {
    const query = new URLSearchParams({ organization_id: organizationId });
    if (params?.warehouse_template_id) query.set('warehouse_template_id', params.warehouse_template_id);
    if (params?.date) query.set('date', params.date);
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`${API}/warehouse-manager/dock-schedule/my?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSchedulePage>;
  }

  async findById(token: string, id: string): Promise<DockSchedule> {
    const res = await fetch(`${API}/warehouse-manager/dock-schedule/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSchedule>;
  }

  async confirm(token: string, id: string): Promise<DockSchedule> {
    const res = await fetch(`${API}/warehouse-manager/dock-schedule/${id}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSchedule>;
  }

  async cancel(token: string, id: string, reason?: string): Promise<DockSchedule> {
    const res = await fetch(`${API}/warehouse-manager/dock-schedule/${id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancellation_reason: reason }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSchedule>;
  }

  async markArrived(token: string, id: string): Promise<{ schedule: DockSchedule; vehicle_log: unknown }> {
    const res = await fetch(`${API}/warehouse-manager/dock-schedule/${id}/arrive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async markCompleted(token: string, id: string): Promise<DockSchedule> {
    const res = await fetch(`${API}/warehouse-manager/dock-schedule/${id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSchedule>;
  }

  async markNoShow(token: string, id: string): Promise<DockSchedule> {
    const res = await fetch(`${API}/warehouse-manager/dock-schedule/${id}/no-show`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<DockSchedule>;
  }

  async delete(token: string, id: string): Promise<void> {
    const res = await fetch(`${API}/warehouse-manager/dock-schedule/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
  }
}
