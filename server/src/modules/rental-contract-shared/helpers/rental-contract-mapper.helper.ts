import { Injectable } from '@nestjs/common';
import { IRentalContractWithRelations } from '../interfaces';

@Injectable()
export class RentalContractMapper {
  /**
   * Map dữ liệu RentalContract từ DB sang định dạng chuẩn cho Frontend.
   * - Xử lý BigInt sang String.
   * - Flatten addons, insurances.
   * - Map payments, history (logs).
   */
  static mapToFrontend(contract: any): any {
    if (!contract) return null;

    // 1. Chuyển đổi an toàn: Xử lý BigInt trước khi JSON.stringify
    const safeContract = JSON.parse(
      JSON.stringify(contract, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );

    // 2. Map addons: Flatten RentalContractAddon -> Addon info
    const mappedAddons = safeContract.addons
      ?.filter((a: any) => !a.is_cancelled && !a.is_deleted)
      ?.map((a: any) => ({
        id: a.addon?.id ?? a.addon_id,
        addon_id: a.addon_id,
        name: a.addon?.name ?? '',
        price: Number(a.price_at_purchase ?? a.addon?.price ?? 0),
        is_gift: a.is_gift,
        is_cancelled: a.is_cancelled,
        created_at: a.created_at,
      })) ?? [];

    // 3. Map insurances: Flatten RentalContractInsurance -> Insurance info
    const mappedInsurances = safeContract.insurances
      ?.filter((ins: any) => !ins.is_cancelled && !ins.is_deleted)
      ?.map((ins: any) => ({
        id: ins.insurance?.id ?? ins.insurance_id,
        insurance_id: ins.insurance_id,
        name: ins.insurance?.name ?? '',
        price: Number(ins.price_at_purchase ?? ins.insurance?.price ?? 0),
        management_fee: Number(ins.management_fee ?? 0),
        is_gift: ins.is_gift,
        created_at: ins.created_at,
      })) ?? [];

    // 4. Map history từ logs
    const mappedHistory = safeContract.logs?.map((log: any) => ({
      id: log.id,
      type: log.action,
      description: log.description,
      metadata: log.metadata,
      created_at: log.created_at,
      created_by: log.created_by,
    })) ?? [];

    // 5. Map payments: Đảm bảo đầy đủ thông tin
    const mappedPayments = safeContract.payments?.map((p: any) => ({
      ...p,
      method: p.method || safeContract.payment_method,
      transaction_code: p.payment_code || p.transaction_code,
    })) ?? [];

    // 6. Map signatures
    const mappedSignatures = safeContract.signatures?.map((s: any) => ({
      id: s.id,
      url: s.imagekit_url,
      expires_at: s.expires_at,
      created_at: s.created_at,
    })) ?? [];

    return {
      ...safeContract,
      addons: mappedAddons,
      insurances: mappedInsurances,
      history: mappedHistory,
      payments: mappedPayments,
      signatures: mappedSignatures,
      // Map warehouses summary from details if needed
      warehouses: safeContract.details?.map((d: any) => ({
        id: d.warehouse?.id || d.warehouse_template?.id || d.id,
        name: d.warehouse?.name || d.warehouse_name || d.warehouse_template?.name || '—',
      })) ?? [],
    };
  }
}
