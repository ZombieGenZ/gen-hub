import { Injectable, Logger } from '@nestjs/common';

export interface ExportItemStats {
  item_count: number;
  total_weight_kg: number;
  fragile_count: number;
  oversized_count: number;
  liquid_count: number;
  avg_volume_cm3: number;
}

export interface RoutePlanExport {
  id: string;
  code: string;
  delivery_address: string;
  lat?: number;
  lng?: number;
  required_date?: string;
  partner_name: string;
  items: ExportItemStats;
}

export interface RoutePlanAiRequest {
  warehouse: { name: string; lat?: number; lng?: number };
  exports: RoutePlanExport[];
  departure_time?: string;
}

export interface RouteStop {
  sequence: number;
  export_id: string;
  export_code: string;
  partner_name: string;
  delivery_address: string;
  estimated_arrival: string;
  estimated_departure: string;
  travel_time_minutes: number;
  distance_km: number;
  required_date?: string;
  deadline_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'MISSED';
  deadline_buffer_minutes?: number;
  delivery_sequence_rank: number;
}

export interface DeadlineWarning {
  export_id: string;
  export_code: string;
  required_date: string;
  estimated_arrival: string;
  deadline_risk: string;
  message: string;
}

export interface RoutePlanAiResponse {
  loading_time_minutes: number;
  departure_after_loading: string;
  route: RouteStop[];
  total_route_time_minutes: number;
  deadline_warnings: DeadlineWarning[];
  delivery_sequence: string[];
  algorithm_used: string;
}

@Injectable()
export class RoutePlanningAiService {
  private readonly logger = new Logger(RoutePlanningAiService.name);
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  constructor() {
    this.baseUrl = process.env.ROUTE_PLANNER_AI_URL ?? 'http://localhost:8003';
    this.enabled = process.env.USE_ROUTE_PLANNING_AI !== 'false';
  }

  async planRoute(
    req: RoutePlanAiRequest,
  ): Promise<RoutePlanAiResponse | null> {
    if (!this.enabled) return null;

    try {
      const res = await fetch(`${this.baseUrl}/plan-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(
          `RoutePlannerAI responded ${res.status}: ${text.slice(0, 200)}`,
        );
        return null;
      }

      const data = (await res.json()) as RoutePlanAiResponse;
      this.logger.log(
        `RoutePlannerAI: ${data.route.length} stops, loading=${data.loading_time_minutes}min, warnings=${data.deadline_warnings.length}`,
      );
      return data;
    } catch (err) {
      this.logger.warn(`RoutePlannerAI unavailable: ${String(err)}`);
      return null;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
