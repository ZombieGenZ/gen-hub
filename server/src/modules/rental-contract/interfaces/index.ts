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
            full_name?: string;
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

/**
 * Interface response phân trang
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

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
    paymentUrl?: string;
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
