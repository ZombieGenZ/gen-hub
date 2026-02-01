import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import { ContractData, ContractFieldMapping, ContractGenerationOptions, ContractGenerationResult } from '@/types/contract/contract.type';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Service for generating rental contracts from template
 */
export class ContractTemplateService {
    private templatePath = '/Dự thảo hợp đồng cho thuê GenHub.pdf';

    /**
     * Format currency for display in contract
     */
    private formatCurrency(amount: number): string {
        return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
    }

    /**
     * Format number with Vietnamese locale
     */
    private formatNumber(num: number): string {
        return num.toLocaleString('vi-VN');
    }

    /**
     * Convert ContractData to field mappings
     */
    private mapContractDataToFields(data: ContractData): ContractFieldMapping {
        const startDate = new Date(data.rental.start_date);
        const endDate = new Date(data.rental.end_date);

        return {
            // Company
            company_name: data.organization.name,
            company_international_name: data.organization.international_name,
            company_tax_code: data.organization.tax_code,
            company_headquarters_address: data.organization.headquarters_address,
            company_invoice_address: data.organization.invoice_address,

            // Representative
            representative_name: data.representative.name,
            representative_title: data.representative.title,
            representative_phone: data.representative.phone,
            representative_email: data.representative.email,

            // Warehouse
            warehouse_name: data.warehouse.name,
            warehouse_address: data.warehouse.address,
            warehouse_area: data.warehouse.area,
            rental_type: data.rental.type,
            rental_type_display: data.rental.type === 'whole' ? 'Thuê nguyên kho' : 'Thuê theo dãy',

            // Period
            start_date: format(startDate, 'd/M/yyyy', { locale: vi }),
            end_date: format(endDate, 'd/M/yyyy', { locale: vi }),
            duration_months: data.rental.duration_months,

            // Financial
            base_price_per_month: data.quotation.basePrice,
            base_price_total: data.quotation.basePrice * data.quotation.durationMonths,
            duration_discount_percent: data.quotation.durationDiscountPercent,
            duration_discount_amount: data.quotation.durationDiscountAmount,
            addons_cost: data.quotation.addonsCost,
            insurance_cost: data.quotation.insuranceCost,
            subtotal: data.quotation.subtotal,
            service_fee: data.quotation.serviceFee,
            grand_total: data.quotation.grandTotal,
            deposit_amount: data.deposit_amount,

            // Services
            addon_list: data.addons.map(a => a.name),
            insurance_name: data.insurance?.name,

            // Metadata
            contract_code: data.contract_code,
            contract_date: format(new Date(data.contract_date), 'd/M/yyyy', { locale: vi }),
        };
    }

    /**
     * Generate contract PDF from template
     */
    async generateContract(
        contractData: ContractData,
        options: ContractGenerationOptions = {}
    ): Promise<ContractGenerationResult> {
        try {
            // Load template PDF
            const templateBytes = await fetch(this.templatePath).then(res => res.arrayBuffer());
            const pdfDoc = await PDFDocument.load(templateBytes);

            // Get field mappings
            const fields = this.mapContractDataToFields(contractData);

            // Check if PDF has form fields
            const form = pdfDoc.getForm();
            const formFields = form.getFields();

            if (formFields.length > 0) {
                // Fill form fields if available
                await this.fillFormFields(form, fields);
            } else {
                // Fallback: Add text annotations
                await this.addTextOverlay(pdfDoc, fields);
            }

            // Flatten form (make fields non-editable)
            if (formFields.length > 0) {
                form.flatten();
            }

            // Save PDF
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            return {
                success: true,
                contract_blob: blob,
            };
        } catch (error) {
            console.error('Contract generation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Fill PDF form fields with contract data
     */
    private async fillFormFields(form: any, fields: ContractFieldMapping): Promise<void> {
        const fieldMappings: Record<string, string | number> = {
            // Company fields
            'company_name': fields.company_name,
            'tax_code': fields.company_tax_code,
            'headquarters_address': fields.company_headquarters_address,
            'representative_name': fields.representative_name,
            'representative_title': fields.representative_title,
            'representative_phone': fields.representative_phone,
            'representative_email': fields.representative_email,

            // Warehouse fields
            'warehouse_name': fields.warehouse_name,
            'warehouse_address': fields.warehouse_address,
            'rental_type': fields.rental_type_display,

            // Period fields
            'start_date': fields.start_date,
            'end_date': fields.end_date,
            'duration_months': fields.duration_months.toString(),

            // Financial fields
            'base_price': this.formatCurrency(fields.base_price_per_month),
            'total_base_price': this.formatCurrency(fields.base_price_total),
            'discount_percent': `${fields.duration_discount_percent}%`,
            'discount_amount': this.formatCurrency(fields.duration_discount_amount),
            'addons_cost': this.formatCurrency(fields.addons_cost),
            'insurance_cost': this.formatCurrency(fields.insurance_cost),
            'service_fee': this.formatCurrency(fields.service_fee),
            'grand_total': this.formatCurrency(fields.grand_total),
            'deposit_amount': this.formatCurrency(fields.deposit_amount),

            // Metadata
            'contract_code': fields.contract_code || '',
            'contract_date': fields.contract_date,
        };

        // Fill each field
        for (const [fieldName, value] of Object.entries(fieldMappings)) {
            try {
                const field = form.getTextField(fieldName);
                if (field) {
                    field.setText(String(value));
                }
            } catch (e) {
                // Field doesn't exist or is not a text field
                console.warn(`Field ${fieldName} not found or invalid`);
            }
        }
    }

    /**
     * Add text overlay to PDF (fallback if no form fields)
     */
    private async addTextOverlay(pdfDoc: PDFDocument, fields: ContractFieldMapping): Promise<void> {
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // This is a simple implementation - coordinates need to be adjusted based on actual PDF layout
        // For production, you'd need to map exact positions for each field

        const fontSize = 11;
        const textColor = rgb(0, 0, 0);

        // Example text placements (adjust coordinates based on actual template)
        const textPlacements = [
            { text: fields.company_name, x: 150, y: 700 },
            { text: fields.company_tax_code, x: 150, y: 680 },
            { text: fields.warehouse_name, x: 150, y: 600 },
            { text: fields.start_date, x: 150, y: 580 },
            { text: this.formatCurrency(fields.grand_total), x: 400, y: 400 },
        ];

        for (const placement of textPlacements) {
            firstPage.drawText(placement.text, {
                x: placement.x,
                y: placement.y,
                size: fontSize,
                color: textColor,
            });
        }
    }

    /**
     * Download contract as PDF file
     */
    downloadContract(blob: Blob, filename: string = 'hop-dong-thue-kho.pdf'): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

export const contractTemplateService = new ContractTemplateService();
