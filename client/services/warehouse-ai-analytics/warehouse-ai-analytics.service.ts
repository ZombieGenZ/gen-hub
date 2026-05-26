import { authStorage } from '../auth/auth-storage.service';
import type {
  AiOverview,
  AiFunnel,
  AiPricePosition,
  AiRecentQuery,
} from './warehouse-ai-analytics.types';

const API = process.env.NEXT_PUBLIC_API_URL;

class WarehouseAiAnalyticsService {
  private getHeaders(): HeadersInit {
    const token = authStorage.getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }

  private async get<T>(path: string, warehouseTemplateId: string): Promise<T> {
    const res = await fetch(
      `${API}/admin/warehouse-ai-analytics/${path}?warehouse_template_id=${warehouseTemplateId}`,
      { headers: this.getHeaders() },
    );
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    return res.json();
  }

  getOverview(id: string): Promise<AiOverview> {
    return this.get<AiOverview>('overview', id);
  }

  getFunnel(id: string): Promise<AiFunnel> {
    return this.get<AiFunnel>('funnel', id);
  }

  getPricePosition(id: string): Promise<AiPricePosition> {
    return this.get<AiPricePosition>('price-position', id);
  }

  getRecentQueries(id: string): Promise<AiRecentQuery[]> {
    return this.get<AiRecentQuery[]>('recent-queries', id);
  }
}

export const warehouseAiAnalyticsService = new WarehouseAiAnalyticsService();
