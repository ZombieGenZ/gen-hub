export type VisitStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | string;

export interface WarehouseTemplateSummary {
  name?: string;
}

export interface WarehouseVisit {
  id: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_email: string;
  visit_date: string;
  visit_time_start: string;
  visit_time_end: string;
  status: VisitStatus;
  code?: string;
  number_of_visitors?: number;
  purpose?: string;
  warehouse_template?: WarehouseTemplateSummary | null;
}

export interface WarehouseVisitListResponse {
  items: WarehouseVisit[];
}

export interface CalendarVisitEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: VisitStatus;
  resource: WarehouseVisit;
}
