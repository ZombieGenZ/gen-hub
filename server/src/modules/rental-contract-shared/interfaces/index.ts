import { RentalContract, RentalContractDetail } from '@prisma/client';

/**
 * Interface rental contract với relations
 */
export interface IRentalContractWithRelations extends RentalContract {
  organization?: {
    id: string;
    name: string;
    owner?: {
      id: string;
      email: string;
      name?: string;
    };
  };
  details?: IRentalContractDetailWithRelations[];
}

export interface IRentalContractDetailWithRelations extends RentalContractDetail {
  detail_rows?: {
    row_template_id: string;
    row_template?: {
      id: string;
      name: string;
      code: string;
    } | null;
  }[];
  warehouse_template?: {
    id: string;
    name: string;
    images?: {
      id: string;
      url: string;
      thumbnail_url?: string | null;
      order: number;
    }[];
  } | null;
  warehouse?: {
    id: string;
    name: string;
  } | null;
  row?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';

/**
 * Interface tính giá thuê cho mỗi template
 */
export interface IRentalPriceCalculation {
  templateId: string;
  warehouseName: string;
  warehouseDescription?: string;
  contentsDescription?: string;
  rowTemplateIds: string[];
  isWholeWarehouse: boolean;
  pricePerMonth: number;
  discountRate: number;
  rentalDays: number;
  subtotal: number;
}

/**
 * Interface kết quả upload chữ ký
 */
export interface ISignatureUploadResult {
  signatureId: string;
  fileId: string;
  filePath: string;
  expiresAt: Date;
  signedUrl: string;
}

/**
 * Interface kết quả tạo contract
 */
export interface ICreateContractResult {
  contract: IRentalContractWithRelations;
  payment?: IPaymentInfo;
  signature?: ISignatureUploadResult | null;
}

/**
 * Interface kết quả gia hạn contract
 */
export interface IRenewContractResult {
  contract: IRentalContractWithRelations;
  payment?: IPaymentInfo;
  signature?: ISignatureUploadResult | null;
}

/**
 * Interface thông tin thanh toán từ SePay
 */
export interface IPaymentInfo {
  paymentId: string;
  paymentCode: string; // Mã thanh toán (thay orderCode)
  amount: number;
  qrCode: string; // URL QR từ qr.sepay.vn
  payment_url?: string; // Alias cho qrCode hoặc link thanh toán
  status: string;
  expiredAt: Date;
  bankInfo?: {
    accountNumber: string;
    bankName: string;
    accountHolder: string;
  };
}

/**
 * Interface cho email thông báo thay đổi thời gian hợp đồng
 */
export interface IContractTimeChangedEmail {
  ownerEmail: string;
  ownerName?: string;
  contractCode: string;
  adjustMonths: number;
  newExpiredAt: Date;
  lang: string;
}

/**
 * Interface cho email thông báo hủy addon
 */
export interface IAddonCancelledEmail {
  ownerEmail: string;
  ownerName?: string;
  contractCode: string;
  addonName: string;
  cancelReason: string;
  lang: string;
}

/**
 * Interface cho email thông báo hủy hợp đồng
 */
export interface IContractCancelledEmail {
  ownerEmail: string;
  ownerName?: string;
  contractCodes: string[];
  deletedBy?: string;
  lang: string;
}
