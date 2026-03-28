import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { IRentalContractWithRelations } from './interfaces';

@Injectable()
export class PdfService {
    private readonly logger = new Logger(PdfService.name);
    private readonly templatePath = path.join(process.cwd(), 'assets', 'contract-template.pdf');

    /**
     * Format currency for display in contract
     */
    private formatCurrency(amount: any): string {
        const value = typeof amount === 'number' ? amount : parseFloat(amount.toString());
        return `${Math.round(value).toLocaleString('vi-VN')}₫`;
    }

    /**
     * Generate contract PDF from database model
     * @param contract Contract data with relations
     * @returns PDF buffer
     */
    async generateContractPdf(contract: IRentalContractWithRelations): Promise<Buffer> {
        try {
            const templateBytes = await fs.readFile(this.templatePath);
            const pdfDoc = await PDFDocument.load(templateBytes);
            const form = pdfDoc.getForm();

            const startDate = new Date(contract.started_at);
            const endDate = new Date(contract.expired_at);
            const contractDate = new Date(contract.created_at);

            // Calculate duration in months approximately
            const durationMonths = Math.round((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000));

            const fieldMappings: Record<string, string> = {
                'company_name': contract.organization?.name || '',
                'company_tax_code': (contract.organization as any)?.tax_code || '',
                'headquarters_address': (contract.organization as any)?.headquarters_address || '',
                'representative_name': (contract.organization as any)?.representative_name || '',
                'representative_title': (contract.organization as any)?.representative_title || '',
                'representative_phone': (contract.organization as any)?.representative_phone || '',
                'representative_email': (contract.organization as any)?.owner?.email || '',

                'warehouse_name': contract.details?.[0]?.warehouse_name || '',
                'rental_days': contract.details?.[0]?.rental_days?.toString() || '',
                'start_date': format(startDate, 'dd/MM/yyyy', { locale: vi }),
                'end_date': format(endDate, 'dd/MM/yyyy', { locale: vi }),
                'duration_months': durationMonths.toString(),

                'base_price': this.formatCurrency(contract.total_price),
                'grand_total': this.formatCurrency(contract.final_price),
                'contract_code': contract.code,
                'contract_date': format(contractDate, 'dd/MM/yyyy', { locale: vi }),
            };

            // Fill form fields
            for (const [fieldName, value] of Object.entries(fieldMappings)) {
                try {
                    const field = form.getTextField(fieldName);
                    if (field) {
                        field.setText(value);
                    }
                } catch (e) {
                    // Field not found or not a text field
                }
            }

            // Flatten form
            form.flatten();

            const pdfBytes = await pdfDoc.save();
            return Buffer.from(pdfBytes);
        } catch (error) {
            this.logger.error(`Failed to generate PDF for contract ${contract.id}: ${error.message}`);
            throw error;
        }
    }
}
