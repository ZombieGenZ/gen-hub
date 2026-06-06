import { Injectable, Logger } from '@nestjs/common';

export interface BinPackingAiItem {
  id: string;
  product_id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
  stackable: boolean;
  packaging_method: string;
  delivery_sequence_rank?: number; // 0=first delivery (near exit), 1=last (deep in truck)
}

export interface BinPackingAiContainer {
  length: number;
  width: number;
  height: number;
  max_weight: number;
}

export interface BinPackingAiResult {
  suggested_vehicle_type: string;
  suggested_container: BinPackingAiContainer;
  items_with_priority: Array<{
    id: string;
    product_id: string;
    priority_score: number;
  }>;
  model_used_vehicle: string;
  model_used_packing: string;
  confidence_vehicle: number;
  loading_time_minutes?: number;
}

@Injectable()
export class BinPackingAiService {
  private readonly logger = new Logger(BinPackingAiService.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BIN_PACKING_AI_URL ?? 'http://localhost:8002';
  }

  async optimize(input: {
    items: BinPackingAiItem[];
    container?: BinPackingAiContainer;
    preferred_vehicle_type?: string;
  }): Promise<BinPackingAiResult | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(`${this.baseUrl}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        this.logger.error(`BinPackingAI HTTP ${res.status}`);
        return null;
      }

      return (await res.json()) as BinPackingAiResult;
    } catch (err) {
      this.logger.error(`BinPackingAiService error: ${(err as Error).message}`);
      return null;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
