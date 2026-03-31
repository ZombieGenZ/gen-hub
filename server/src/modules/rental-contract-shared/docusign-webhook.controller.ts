import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';

import { RentalContractRepository } from './rental-contract.repository';
import { OkResponse } from '../../common/responses';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemLogService } from '../system-log/system-log.service';

const DOCUSIGN_WEBHOOK_SCHEMA = {
    type: 'object',
    properties: {
        event: { type: 'string', description: 'Tên sự kiện DocuSign Connect gửi về', example: 'envelope-completed' },
        data: {
            type: 'object',
            description: 'Dữ liệu chi tiết của sự kiện',
            properties: {
                envelopeId: { type: 'string', description: 'ID phong bì DocuSign', example: '0a6f2bc8-54db-4d17-93d4-0d565af4fd20' },
                status: { type: 'string', description: 'Trạng thái phong bì', example: 'completed' },
                completedDateTime: { type: 'string', format: 'date-time', description: 'Thời điểm hoàn tất ký', example: '2026-03-31T10:20:00.000Z' },
            },
        },
    },
};

@ApiTags('Internal Webhooks')
@Controller('webhooks/docusign')
export class DocusignWebhookController {
    private readonly logger = new Logger(DocusignWebhookController.name);

    constructor(
        private readonly repository: RentalContractRepository,
        private readonly systemLogService: SystemLogService,
        private readonly prisma: PrismaService,
    ) { }

    @Post()
    @HttpCode(200)
    @ApiOperation({
        summary: 'DocuSign Connect Webhook',
        description:
            'Endpoint nội bộ nhận webhook từ DocuSign Connect. ' +
            'Khi nhận sự kiện `envelope-completed`, hệ thống sẽ dò lại hợp đồng tương ứng và kích hoạt hợp đồng nếu tìm thấy bản ghi liên quan.',
    })
    @ApiBody({
        description: 'Payload webhook do DocuSign gửi tới hệ thống',
        schema: DOCUSIGN_WEBHOOK_SCHEMA,
        examples: {
            envelope_completed: {
                summary: 'Webhook hoàn tất ký',
                description: 'DocuSign thông báo phong bì đã được ký đầy đủ',
                value: {
                    event: 'envelope-completed',
                    data: {
                        envelopeId: '0a6f2bc8-54db-4d17-93d4-0d565af4fd20',
                        status: 'completed',
                        completedDateTime: '2026-03-31T10:20:00.000Z',
                    },
                },
            },
            other_event: {
                summary: 'Webhook sự kiện khác',
                description: 'Ví dụ sự kiện khác vẫn được hệ thống chấp nhận để log và phản hồi 200',
                value: {
                    event: 'recipient-sent',
                    data: {
                        envelopeId: '0a6f2bc8-54db-4d17-93d4-0d565af4fd20',
                        status: 'sent',
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Webhook được tiếp nhận và xử lý thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'docusign.webhook_processed' },
                message: { type: 'string', example: 'Đã tiếp nhận webhook DocuSign thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        received: { type: 'boolean', example: true },
                        event: { type: 'string', example: 'envelope-completed' },
                        envelopeId: { type: 'string', nullable: true, example: '0a6f2bc8-54db-4d17-93d4-0d565af4fd20' },
                    },
                },
            },
        },
    })
    async handleWebhook(@Body() payload: any) {
        const event = payload.event;
        const envelopeId = payload.data?.envelopeId;

        this.logger.log(`Received DocuSign webhook event: ${event} for envelope ${envelopeId}`);

        if (event === 'envelope-completed') {
            this.systemLogService.info(
                'rental-contract',
                'docusign_completed',
                `DocuSign envelope ${envelopeId} completed.`,
                { metaData: { envelopeId, payload } },
            );

            if (envelopeId) {
                try {
                    const log = await this.prisma.systemLog.findFirst({
                        where: {
                            module: 'rental-contract',
                            action: 'docusign_sent',
                            meta_data: { path: ['envelopeId'], equals: envelopeId },
                        },
                        orderBy: { created_at: 'desc' },
                    });

                    if (log && log.meta_data && typeof log.meta_data === 'object' && 'contractId' in log.meta_data) {
                        const contractId = (log.meta_data as any).contractId;

                        await this.repository.updateStatus(contractId, ContractStatus.ACTIVE, 'system-webhook');
                        this.logger.log(`Contract ${contractId} has been activated successfully based on DocuSign envelope ${envelopeId}.`);

                        this.systemLogService.info(
                            'rental-contract',
                            'contract_activated',
                            `Contract ${contractId} activated from DocuSign webhook.`,
                            { metaData: { contractId, envelopeId } },
                        );
                    } else {
                        this.logger.warn(`Could not find contract ID in system logs for envelope ${envelopeId}`);
                    }
                } catch (error) {
                    this.logger.error(`Error updating contract status for envelope ${envelopeId}:`, error);
                }
            }
        }

        return new OkResponse(
            'docusign.webhook_processed',
            {
                received: true,
                event,
                envelopeId: envelopeId ?? null,
            },
            'Đã tiếp nhận webhook DocuSign thành công',
        );
    }
}
