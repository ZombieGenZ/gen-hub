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
  private static mapLogActionToType(action: string): string {
    const map: Record<string, string> = {
      CREATED: 'created',
      RENEWED: 'renewed',
      CANCELLED: 'cancelled',
      COMPLETED: 'completed',
      STATUS_CHANGED: 'updated',
      ADDON_ADDED: 'updated',
      ADDON_CANCELLED: 'updated',
      COUPON_APPLIED: 'updated',
    };
    return map[action] ?? 'updated';
  }

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

    const mappedHistory = safeContract.logs?.map((log: any) => ({
      id: log.id,
      type: RentalContractMapper.mapLogActionToType(log.action),
      description: log.description,
      metadata: log.metadata,
      created_at: log.created_at,
      actor: log.created_by_user ? {
        name: log.created_by_user.name || log.created_by_user.email,
        role: log.created_by_user.role?.name,
      } : undefined,
    })) ?? [];

    // 5. Map payments: Đảm bảo đầy đủ thông tin
    const mappedPayments = safeContract.payments?.map((p: any) => ({
      ...p,
      method: p.method || safeContract.payment_method,
      transaction_code: p.payment_code || p.transaction_code,
    })) ?? [];

    // 6. Map signatures sang signers (Frontend mong đợi định dạng này)
    const mappedSigners = safeContract.signatures?.map((s: any) => ({
      id: s.id,
      name: 'Khách hàng', // Hiện tại DB chưa lưu tên người ký cụ thể, để mặc định
      role: 'Người đại diện',
      signed: true,
      signedAt: s.created_at,
      avatar: s.imagekit_url,
      url: s.imagekit_url,
    })) ?? [];

    return {
      ...safeContract,
      addons: mappedAddons,
      insurances: mappedInsurances,
      history: mappedHistory,
      payments: mappedPayments,
      signers: mappedSigners,
      vat_amount: Number(safeContract.vat_amount || 0),
      vat_rate: Number(safeContract.vat_rate || 0),
      total_price: Number(safeContract.total_price || 0),
      final_price: Number(safeContract.final_price || 0),
      // Map warehouses summary from details if needed
      warehouses: safeContract.details?.map((d: any) => ({
        id: d.warehouse?.id || d.warehouse_template?.id || d.id,
        name: d.warehouse?.name || d.warehouse_name || d.warehouse_template?.name || '—',
      })) ?? [],
    };
  }
}
