import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RentalContractRepository } from './rental-contract.repository';
import { ContractStatus } from '@prisma/client';
import { SystemLogService } from '../system-log/system-log.service';

@ApiTags('Internal Webhooks')
@Controller('webhooks/docusign')
export class DocusignWebhookController {
    private readonly logger = new Logger(DocusignWebhookController.name);

    constructor(
        private readonly repository: RentalContractRepository,
        private readonly systemLogService: SystemLogService,
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
            // Tìm hợp đồng theo envelopeId? Chúng ta chưa lưu envelopeId vào DB field riêng.
            // Tạm thời log lại thông tin. 
            // Trong thực tế, chúng ta nên lưu envelope_id vào table rental_contracts.
            
            this.systemLogService.info(
                'rental-contract',
                'docusign_completed',
                `DocuSign envelope ${envelopeId} completed.`,
                { metaData: { envelopeId, payload } }
            );

            // TODO: Update contract status to SIGNED or ACTIVE
            // Vì hiện tại chưa có field envelope_id trong DB, tôi sẽ giả định có logic tìm contract 
            // hoặc user sẽ báo lại sau khi ký xong qua callback URL.
        }

        return { success: true };
    }
}
