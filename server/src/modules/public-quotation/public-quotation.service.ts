import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PublicQuotationRepository, IWarehouseForQuotation } from './public-quotation.repository';
import { CalculateQuotationDto } from './dto';
import { IQuotationResult, IRowDetail, IAddonDetail, IInsuranceDetail, ICouponDetail } from './types';
import { QUOTATION_CONSTANTS } from './constants';

@Injectable()
export class PublicQuotationService {
    constructor(private readonly repository: PublicQuotationRepository) {}

    /**
     * Tính báo giá thuê kho (Public API)
     * Dùng cho trang Checkout để tính giá phía server
     */
    async calculateQuotation(dto: CalculateQuotationDto): Promise<IQuotationResult> {
        // 1. Lấy thông tin warehouse template
        const warehouse = await this.repository.findWarehouseForQuotation(dto.warehouse_template_id);

        if (!warehouse) {
            throw new NotFoundException('Không tìm thấy kho');
        }

        // Kiểm tra trạng thái sẵn sàng
        const isAvailable = !warehouse.is_rented &&
            warehouse.rental_status !== 'RENTED' &&
            warehouse.rental_status !== 'LOCKED';

        // 2. Lấy thông tin gói thời gian
        const tier = await this.repository.findDurationTier(dto.duration_tier_id);

        if (!tier) {
            throw new BadRequestException('Không tìm thấy gói thời gian');
        }

        const durationMonths = tier.duration_unit === 'YEAR'
            ? tier.duration_value * 12
            : tier.duration_value;

        // 3. Tính giá gốc
        const isWholeWarehouse = dto.rental_type === 'whole' ||
            !dto.row_template_ids ||
            dto.row_template_ids.length === 0;

        let basePricePerMonth = 0;
        const rowDetails: IRowDetail[] = [];

        if (isWholeWarehouse) {
            basePricePerMonth = Number(warehouse.price_per_month);
        } else {
            // Validate thuê theo dãy cho kho chia sẻ
            if (!warehouse.is_shared_warehouse) {
                throw new BadRequestException('Kho này không hỗ trợ thuê theo dãy');
            }

            for (const rowId of dto.row_template_ids!) {
                const row = warehouse.rows.find(r => r.id === rowId);
                if (!row) {
                    throw new BadRequestException(`Không tìm thấy dãy ${rowId}`);
                }
                if (row.is_rented) {
                    throw new BadRequestException(`Dãy ${row.name} đã được thuê`);
                }
                basePricePerMonth += Number(row.price_per_month);
                rowDetails.push({
                    id: row.id,
                    name: row.name,
                    price_per_month: Number(row.price_per_month),
                });
            }
        }

        // 4. Tính giảm giá theo thời gian thuê
        let durationDiscountPercent = 0;
        const discountConfig = warehouse.discount_configs.find(
            dc => dc.duration_tier_id === dto.duration_tier_id,
        );
        if (discountConfig) {
            durationDiscountPercent = Number(discountConfig.discount_percent);
        }

        const totalBaseRental = basePricePerMonth * durationMonths;
        const durationDiscountAmount = totalBaseRental * (durationDiscountPercent / 100);

        // 5. Tính phí addon
        let addonsCost = 0;
        const addonDetails: IAddonDetail[] = [];

        if (dto.addon_ids && dto.addon_ids.length > 0) {
            const addons = await this.repository.findAddonsByIds(dto.addon_ids);

            for (const addon of addons) {
                const price = addon.is_monthly_payment
                    ? Number(addon.price) * durationMonths
                    : Number(addon.price);
                addonsCost += price;
                addonDetails.push({
                    id: addon.id,
                    name: addon.name,
                    price,
                    is_monthly: addon.is_monthly_payment,
                });
            }
        }

        // 6. Tính phí bảo hiểm
        let insuranceCost = 0;
        let managementFee = 0;
        let insuranceDetails: IInsuranceDetail | undefined;

        if (dto.insurance_id) {
            const insurance = await this.repository.findInsurance(dto.insurance_id);

            if (insurance) {
                insuranceCost = Number(insurance.price) * durationMonths;
                insuranceDetails = {
                    id: insurance.id,
                    name: insurance.name,
                    price: insuranceCost,
                };

                if (insurance.use_management_fee && insurance.management_fee_value) {
                    if (insurance.management_fee_type === 'PERCENT') {
                        managementFee = totalBaseRental * (Number(insurance.management_fee_value) / 100);
                    } else {
                        managementFee = Number(insurance.management_fee_value) * durationMonths;
                    }
                }
            }
        }

        // 7. Tính subtotal và phí dịch vụ
        const subtotal = totalBaseRental - durationDiscountAmount + addonsCost + insuranceCost + managementFee;
        const serviceFee = Math.round(subtotal * QUOTATION_CONSTANTS.SERVICE_FEE_PERCENT);

        // 8. Tính giảm giá coupon
        let couponDiscount = 0;
        let couponDetails: ICouponDetail | undefined;

        if (dto.coupon_code) {
            const coupon = await this.repository.findValidCoupon(dto.coupon_code);

            if (coupon && (coupon.max_usage === 0 || coupon.current_usage < coupon.max_usage)) {
                if (coupon.discount_type === 'PERCENT') {
                    couponDiscount = subtotal * (Number(coupon.discount_value) / 100);
                    if (!coupon.is_unlimited_discount && coupon.max_discount_amount) {
                        couponDiscount = Math.min(couponDiscount, Number(coupon.max_discount_amount));
                    }
                } else if (coupon.discount_type === 'AMOUNT') {
                    couponDiscount = Number(coupon.discount_value);
                }

                couponDetails = {
                    code: coupon.code,
                    discount_amount: couponDiscount,
                };
            }
        }

        // 9. Tính tổng tiền
        const grandTotal = Math.max(0, subtotal + serviceFee - couponDiscount);

        // 10. Tính tiền cọc (backend kiểm soát)
        const depositAmount = Math.max(
            QUOTATION_CONSTANTS.MIN_DEPOSIT_AMOUNT,
            Math.round(grandTotal * QUOTATION_CONSTANTS.DEPOSIT_PERCENT)
        );

        return {
            warehouse_template_id: warehouse.id,
            warehouse_name: warehouse.name,
            rental_type: isWholeWarehouse ? 'whole' : 'row',
            row_details: rowDetails.length > 0 ? rowDetails : undefined,

            duration_tier_id: tier.id,
            duration_tier_name: tier.name,
            duration_months: durationMonths,

            base_price_per_month: basePricePerMonth,
            duration_discount_percent: durationDiscountPercent,
            duration_discount_amount: durationDiscountAmount,

            addons_cost: addonsCost,
            addon_details: addonDetails.length > 0 ? addonDetails : undefined,

            insurance_cost: insuranceCost,
            insurance_details: insuranceDetails,

            management_fee: managementFee,
            service_fee: serviceFee,

            coupon_discount: couponDiscount,
            coupon_details: couponDetails,

            subtotal,
            grand_total: grandTotal,
            deposit_amount: depositAmount,

            is_warehouse_available: isAvailable,
        };
    }
}
