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
