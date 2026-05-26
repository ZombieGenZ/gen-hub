export type WarehouseLegalDocType =
  | 'BUSINESS_LICENSE'
  | 'WAREHOUSE_CERTIFICATE'
  | 'FIRE_SAFETY_CERTIFICATE'
  | 'LAND_USE_RIGHT'
  | 'FOOD_SAFETY_CERTIFICATE'
  | 'OTHER';

export type AiDocAnalysisStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type DocReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_RESUBMIT';
export type TrustBadgeLevel = 'NONE' | 'VERIFIED' | 'PREMIUM';

export const DOC_TYPE_LABELS: Record<WarehouseLegalDocType, string> = {
  BUSINESS_LICENSE: 'Giấy phép kinh doanh',
  WAREHOUSE_CERTIFICATE: 'Chứng nhận kho bãi',
  FIRE_SAFETY_CERTIFICATE: 'Giấy PCCC',
  LAND_USE_RIGHT: 'Quyền sử dụng đất',
  FOOD_SAFETY_CERTIFICATE: 'Giấy VSATTP',
  OTHER: 'Tài liệu khác',
};

export interface AiExtractedData {
  is_valid_document: boolean;
  document_type_detected: string;
  issuer: string | null;
  license_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  is_expired: boolean;
  confidence: number;
  issues: string[];
  summary: string;
}

export interface LegalDocument {
  id: string;
  warehouse_template_id: string;
  document_type: WarehouseLegalDocType;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  ai_status: AiDocAnalysisStatus;
  ai_confidence: number | null;
  ai_extracted_data: AiExtractedData | null;
  ai_issues: string[];
  ai_analyzed_at: string | null;
  review_status: DocReviewStatus;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  warehouse_template?: { id: string; name: string };
}

export interface TrustProfile {
  id: string;
  warehouse_template_id: string;
  trust_score: number;
  badge_level: TrustBadgeLevel;
  score_breakdown: Record<string, number>;
  last_computed_at: string;
}
