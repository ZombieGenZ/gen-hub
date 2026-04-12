export interface CloudflareAnalyticsData {
  requests: {
    all: number;
    cached: number;
    uncached: number;
  };
  bandwidth: {
    all: number;
    cached: number;
    uncached: number;
  };
  threats: {
    all: number;
  };
  pageviews: {
    all: number;
  };
  uniques: {
    all: number;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  data?: CloudflareAnalyticsData;
  errors?: string[];
  period: {
    startDate: string;
    endDate: string;
  };
}
