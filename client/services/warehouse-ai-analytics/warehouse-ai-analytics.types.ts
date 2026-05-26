export interface AiOverview {
  total_impressions: number;
  unique_queries: number;
  avg_rank_position: number | null;
  impressions_7d: number;
  impressions_30d: number;
  ai_visits: number;
  ai_consultations: number;
}

export interface AiFunnelRates {
  impression_to_visit: number;
  visit_to_consultation: number;
  consultation_to_contract: number;
  overall: number;
}

export interface AiFunnel {
  impressions: number;
  visits: number;
  consultations: number;
  contracts: number;
  rates: AiFunnelRates;
  note: string;
}

export interface ProvinceWarehouse {
  id: string;
  name: string;
  price_per_month: number;
  is_current: boolean;
}

export interface AiPricePosition {
  warehouse_id: string;
  price_per_month: number;
  province: { id: string; name: string } | null;
  province_avg: number | null;
  province_min: number | null;
  province_max: number | null;
  province_count: number;
  percentile_rank: number | null;
  province_warehouses: ProvinceWarehouse[];
  note?: string;
  error?: string;
}

export interface AiRecentQuery {
  id: string;
  session_hash: string;
  query_text: string;
  match_score: number | null;
  rank_position: number;
  created_at: string;
}
