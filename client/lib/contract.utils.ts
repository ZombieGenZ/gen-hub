import { CheckoutSession } from '@/types/checkout/checkout.type';
import { ContractData } from '@/types/contract/contract.type';
import { addMonths, format } from 'date-fns';

/**
 * Interface for company and representative data
 */
export interface CheckoutContractData {
    session: Partial<CheckoutSession>;
    company: {
        name: string;
        international_name?: string;
        tax_code: string;
        headquarters_address: string;
        invoice_address?: string;
    };
    representative: {
        name: string;
        title: string;
        phone: string;
        email: string;
    };
    order_id?: string;
}

/**
 * Convert checkout session data to contract data structure
 */
export function convertCheckoutToContract(data: CheckoutContractData): ContractData {
    const { session, company, representative, order_id } = data;

    // Calculate end date
    const startDate = new Date(session.start_date || new Date());
    const endDate = addMonths(startDate, session.duration_months || 1);

    // Generate contract code
    const contractCode = order_id || `GH-${format(new Date(), 'yyyy-MM')}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    return {
        contract_code: contractCode,
        contract_date: new Date().toISOString(),

        organization: {
            name: company.name,
            international_name: company.international_name,
            tax_code: company.tax_code,
            headquarters_address: company.headquarters_address,
            invoice_address: company.invoice_address || company.headquarters_address,
        },

        representative: {
            name: representative.name,
            title: representative.title,
            phone: representative.phone,
            email: representative.email,
        },

        warehouse: {
            template_id: session.warehouse_template_id || '',
            name: session.warehouse_name || '',
            address: session.warehouse_details?.address || '',
            area: undefined, // Would need to be fetched from warehouse data
        },

        rental: {
            type: session.rental_type || 'whole',
            row_ids: session.row_template_ids,
            row_names: session.row_details?.map(r => r.name),
            start_date: session.start_date || new Date().toISOString(),
            end_date: endDate.toISOString(),
            duration_months: session.duration_months || 1,
        },

        addons: session.addon_details?.map(addon => ({
            id: addon.id,
            name: addon.name,
            price: addon.price,
        })) || [],

        insurance: session.insurance_details ? {
            id: session.insurance_details.id,
            name: session.insurance_details.name,
            price: session.insurance_details.price,
        } : undefined,

        quotation: session.quotation || {
            basePrice: 0,
            durationMonths: 0,
            durationDiscountPercent: 0,
            durationDiscountAmount: 0,
            addonsCost: 0,
            insuranceCost: 0,
            managementFee: 0,
            subtotal: 0,
            serviceFee: 0,
            couponDiscount: 0,
            grandTotal: 0,
        },

        deposit_amount: session.deposit_amount || 0,

        status: 'draft',
    };
}
