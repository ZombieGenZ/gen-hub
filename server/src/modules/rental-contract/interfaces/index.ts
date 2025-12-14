import { RentalContract, RentalContractDetail, ContractStatus } from '@prisma/client';

/**
 * Interface rental contract với relations
 */
export interface IRentalContractWithRelations extends RentalContract {
    organization?: {
        id: string;
        name: string;
    };
    details?: IRentalContractDetailWithRelations[];
}

export interface IRentalContractDetailWithRelations extends RentalContractDetail {
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
 * Interface tính giá thuê
 */
export interface IRentalPriceCalculation {
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
