import {
    Controller,
    Post,
    Body,
    Get,
    Query,
    Param,
    Logger,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

import { PayosService } from './payos.service';
import { PayOSWebhookDto, PaymentCallbackQueryDto } from './dto';

/**
 * Controller xử lý webhook và callback từ PayOS
 */
@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(private readonly payosService: PayosService) { }

    /**
     * Webhook nhận thông tin thanh toán từ PayOS
     * PayOS sẽ gọi endpoint này khi có giao dịch thành công
     */
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Webhook nhận thông tin thanh toán từ PayOS' })
    async handleWebhook(@Body() webhookDto: PayOSWebhookDto) {
        this.logger.log(`Received payment webhook: orderCode=${webhookDto.data?.orderCode}`);

        try {
            await this.payosService.handlePaymentWebhook(webhookDto as any);
            return { code: '00', desc: 'success' };
        } catch (error) {
            this.logger.error(`Webhook error: ${error}`);
            return { code: '01', desc: 'error' };
        }
    }

    /**
     * Sync payment status từ PayOS API
     * Dùng khi webhook không hoạt động (localhost, etc.)
     */
    @Post('sync/:orderCode')
    @ApiOperation({ summary: 'Sync payment status từ PayOS (dùng khi webhook không hoạt động)' })
    @ApiParam({ name: 'orderCode', description: 'Mã đơn hàng PayOS' })
    async syncPaymentStatus(@Param('orderCode') orderCode: string) {
        this.logger.log(`Syncing payment status: orderCode=${orderCode}`);

        const result = await this.payosService.syncPaymentStatus(BigInt(orderCode));
        return result;
    }

    /**
     * Return URL sau khi thanh toán thành công
     * Frontend sẽ redirect user đến trang này
     */
    @Get('success')
    @ApiOperation({ summary: 'Callback URL khi thanh toán thành công' })
    async handleSuccess(@Query() query: PaymentCallbackQueryDto) {
        this.logger.log(`Payment success callback: orderCode=${query.orderCode}`);

        // Lấy thông tin payment
        if (query.orderCode) {
            const payment = await this.payosService.getPaymentByOrderCode(
                typeof query.orderCode === 'string'
                    ? parseInt(query.orderCode)
                    : query.orderCode
            );
            return {
                success: true,
                message: 'Thanh toán thành công',
                data: payment ? {
                    orderCode: payment.order_code,
                    amount: payment.amount,
                    status: payment.status,
                    contractId: payment.rental_contract_id,
                } : null,
            };
        }

        return { success: true, message: 'Thanh toán thành công' };
    }

    /**
     * Cancel URL khi hủy thanh toán
     */
    @Get('cancel')
    @ApiOperation({ summary: 'Callback URL khi hủy thanh toán' })
    async handleCancel(@Query() query: PaymentCallbackQueryDto) {
        this.logger.log(`Payment cancelled: orderCode=${query.orderCode}`);

        // Cập nhật status payment nếu có orderCode
        if (query.orderCode) {
            try {
                await this.payosService.cancelPaymentLink(
                    typeof query.orderCode === 'string'
                        ? parseInt(query.orderCode)
                        : query.orderCode
                );
            } catch (error) {
                this.logger.error(`Cancel payment error: ${error}`);
            }
        }

        return { success: false, message: 'Đã hủy thanh toán' };
    }
}
