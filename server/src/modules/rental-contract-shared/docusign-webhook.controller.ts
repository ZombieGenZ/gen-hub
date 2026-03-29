import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RentalContractRepository } from './rental-contract.repository';
import { ContractStatus } from '@prisma/client';
import { SystemLogService } from '../system-log/system-log.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Internal Webhooks')
@Controller('webhooks/docusign')
export class DocusignWebhookController {
    private readonly logger = new Logger(DocusignWebhookController.name);

    constructor(
        private readonly repository: RentalContractRepository,
        private readonly systemLogService: SystemLogService,
        private readonly prisma: PrismaService,
    ) {}

    /**
     * Nhận webhook từ DocuSign Connect
     */
    @Post()
    @HttpCode(200)
    @ApiOperation({ summary: 'DocuSign Connect Webhook' })
    async handleWebhook(@Body() payload: any) {
        const event = payload.event;
        const envelopeId = payload.data?.envelopeId;

        this.logger.log(`Received DocuSign webhook event: ${event} for envelope ${envelopeId}`);

        if (event === 'envelope-completed') {
            // Khi hợp đồng đã ký xong
            this.systemLogService.info(
                'rental-contract',
                'docusign_completed',
                `DocuSign envelope ${envelopeId} completed.`,
                { metaData: { envelopeId, payload } }
            );

            if (envelopeId) {
                try {
                    // Tìm contractId từ system_log đã lưu khi gửi DocuSign
                    const log = await this.prisma.systemLog.findFirst({
                        where: {
                            module: 'rental-contract',
                            action: 'docusign_sent',
                            meta_data: { path: ['envelopeId'], equals: envelopeId }
                        },
                        orderBy: { created_at: 'desc' }
                    });

                    if (log && log.meta_data && typeof log.meta_data === 'object' && 'contractId' in log.meta_data) {
                        const contractId = (log.meta_data as any).contractId;
                        
                        // Cập nhật trạng thái hợp đồng thành ACTIVE
                        await this.repository.updateStatus(contractId, ContractStatus.ACTIVE, 'system-webhook');
                        this.logger.log(`Contract ${contractId} has been activated successfully based on DocuSign envelope ${envelopeId}.`);
                        
                        // Log việc đã cập nhật trạng thái hợp đồng
                        this.systemLogService.info(
                            'rental-contract',
                            'contract_activated',
                            `Contract ${contractId} activated from DocuSign webhook.`,
                            { metaData: { contractId, envelopeId } }
                        );
                    } else {
                        this.logger.warn(`Could not find contract ID in system logs for envelope ${envelopeId}`);
                    }
                } catch (error) {
                    this.logger.error(`Error updating contract status for envelope ${envelopeId}:`, error);
                }
            }
        }

        return { success: true };
    }
}
