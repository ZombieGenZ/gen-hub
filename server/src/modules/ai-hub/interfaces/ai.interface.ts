export interface IEmailClassification {
  isUserContact: boolean;
  isSpamOrAdvertising: boolean;
  category: 'contact' | 'spam' | 'advertising' | 'newsletter' | 'unknown';
  confidence: number;
  reason?: string;
}

export interface IAILogData {
  model: string;
  purpose: string;
  inputText: string;
  outputText?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  isSuccess: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface IEmailClassificationRequest {
  senderEmail: string;
  senderName: string;
  subject: string;
  content: string;
}

export interface IWebformClassification {
  isUserContact: boolean;
  isSpamOrAdvertising: boolean;
  category: 'inquiry' | 'support' | 'spam' | 'advertising' | 'unknown';
  confidence: number;
  reason?: string;
  isPotentialCustomer?: boolean;
}

export interface ICozeConfig {
  enabled: boolean;
  apiKeys: string[];
  botIds: string[];
  apiBaseUrl: string;
}

export interface IDifyConfig {
  enabled: boolean;
  apiKeys: string[];
  appIds: string[];
  apiBaseUrl: string;
}

export interface IAiChatResult {
  success: boolean;
  content: string;
  model: string;
  confidence?: number;
  error?: string;
}

export interface IWarehouseTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  area: number;
  pricePerMonth: number;
  address: string | null;
  isSharedWarehouse: boolean;
  isColdStorage: boolean;
  totalRows: number;
  totalRacks: number;
  totalShelves: number;
  totalBlocks: number;
  addonGifts: { name: string; description: string | null }[];
  insuranceGifts: { name: string; description: string | null }[];
  discountConfigs: {
    tierName: string;
    durationValue: number;
    durationUnit: string;
    discountPercent: number;
  }[];
  images: string[];
}

export interface IRowTemplateSummary {
  id: string;
  warehouseTemplateId: string;
  name: string;
  code: string;
  description: string | null;
  pricePerMonth: number;
  totalRacks: number;
  totalShelves: number;
  totalBlocks: number;
  addonGifts: { name: string; description: string | null }[];
  insuranceGifts: { name: string; description: string | null }[];
  discountConfigs: {
    tierName: string;
    durationValue: number;
    durationUnit: string;
    discountPercent: number;
  }[];
}

export interface IAddonSummary {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isMonthlyPayment: boolean;
  types: string[];
}

export interface IInsuranceSummary {
  id: string;
  name: string;
  description: string | null;
  price: number;
  useManagementFee: boolean;
  managementFeeType: string | null;
  managementFeeValue: number | null;
}

export interface IAiContext {
  warehouseTemplates: IWarehouseTemplateSummary[];
  rowTemplates: IRowTemplateSummary[];
  addons: IAddonSummary[];
  insurances: IInsuranceSummary[];
}

export interface IAiChatOptions {
  discordChannelId?: string;
  discordUserId?: string;
}

export interface IVehicleAnalysisResult {
  license_plate: string;
  plate_confidence: number;
  vehicle_type: 'TRUCK' | 'CAR' | 'MOTORCYCLE' | 'CONTAINER' | 'VAN' | 'OTHER';
  vehicle_color: string;
  plate_format: 'standard' | 'motorcycle_2row' | 'special_blue' | 'military' | 'foreign' | 'unknown';
  condition_flags: string[];
}

export interface IExtractedWarehouseFilters {
  province_name?: string | null;
  area_min?: number | null;
  area_max?: number | null;
  budget_max_monthly?: number | null;
  is_cold_storage?: boolean | null;
  is_shared?: boolean | null;
  keywords?: string | null;
  industry?: string | null;
  location_hints?: string[];
}

export interface IWarehouseRankItem {
  warehouse_id: string;
  match_score: number;
  match_reason: string;
  highlights: string[];
}
