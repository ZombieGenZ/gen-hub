import type { VehicleType, VehiclePurpose } from '@/services/vehicle-log/vehicle-log.types';

export type DockScheduleStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface DockSchedule {
  id: string;
  code: string;
  warehouse_template_id: string;
  organization_id?: string;
  dock_number: number;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  license_plate: string;
  vehicle_type: VehicleType;
  driver_name?: string;
  driver_phone?: string;
  carrier_name?: string;
  purpose: VehiclePurpose;
  linked_receipt_id?: string;
  linked_export_id?: string;
  status: DockScheduleStatus;
  notes?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  vehicle_log_id?: string;
  created_at: string;
  warehouse_template?: { id: string; name: string; dock_count: number };
  organization?: { id: string; name: string };
}

export interface DockSchedulePage {
  items: DockSchedule[];
  total: number;
  hasMore: boolean;
}

export interface DockSlotsResult {
  dock_count: number;
  date: string;
  slots: Record<number, DockSchedule[]>;
}

export interface CreateDockSchedulePayload {
  warehouse_template_id: string;
  organization_id?: string;
  dock_number: number;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  license_plate: string;
  vehicle_type?: VehicleType;
  driver_name?: string;
  driver_phone?: string;
  carrier_name?: string;
  purpose?: VehiclePurpose;
  linked_receipt_id?: string;
  linked_export_id?: string;
  notes?: string;
}

export const DOCK_STATUS_LABELS: Record<DockScheduleStatus, string> = {
  PENDING: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  ARRIVED: 'Xe đã đến',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
  NO_SHOW: 'Không đến',
};

export const DOCK_STATUS_COLORS: Record<DockScheduleStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-teal-100 text-teal-800',
  ARRIVED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-orange-100 text-orange-700',
};

export const DOCK_STATUS_DOT: Record<DockScheduleStatus, string> = {
  PENDING: 'bg-yellow-400',
  CONFIRMED: 'bg-teal-600',
  ARRIVED: 'bg-green-500',
  COMPLETED: 'bg-gray-400',
  CANCELLED: 'bg-red-500',
  NO_SHOW: 'bg-orange-500',
};
