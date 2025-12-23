import { RentalContract, RentalContractDetail, ContractStatus } from '@prisma/client';

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
    warehouse_template?: {
        id: string;
        name: string;
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
    rowTemplateIds: string[];
    isWholeWarehouse: boolean;
    pricePerMonth: number;
    discountRate: number;
    rentalDays: number;
    subtotal: number;
}

/**
 * Interface kết quả tạo contract
 */
export interface ICreateContractResult {
    contract: IRentalContractWithRelations;
    payment?: IPaymentInfo;
}

/**
 * Interface kết quả gia hạn contract
 */
export interface IRenewContractResult {
    contract: IRentalContractWithRelations;
    payment?: IPaymentInfo;
}

/**
 * Interface thông tin thanh toán từ SePay
 */
export interface IPaymentInfo {
    paymentId: string;
    paymentCode: string;      // Mã thanh toán (thay orderCode)
    amount: number;
    qrCode: string;           // URL QR từ qr.sepay.vn
    status: string;
    expiredAt: Date;
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
