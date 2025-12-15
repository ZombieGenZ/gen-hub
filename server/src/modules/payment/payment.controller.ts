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
    Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiHeader } from '@nestjs/swagger';

import { SepayService } from './sepay.service';
import { PaymentSchedulerService } from './payment-scheduler.service';
import { SepayWebhookDto, PaymentCallbackQueryDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Controller xử lý webhook và callback từ SePay
 */
@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(
        private readonly sepayService: SepayService,
        private readonly paymentScheduler: PaymentSchedulerService,
    ) { }

    /**
     * Webhook nhận thông tin thanh toán từ SePay
     * SePay sẽ gọi endpoint này khi có giao dịch mới
     */
    @Post('webhook')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Webhook nhận thông tin thanh toán từ SePay' })
    @ApiHeader({ name: 'Authorization', description: 'Apikey YOUR_API_KEY' })
    async handleWebhook(
        @Body() webhookDto: SepayWebhookDto,
        @Headers('Authorization') authorization: string,
    ) {
        this.logger.log(`Received SePay webhook: id=${webhookDto.id}, content=${webhookDto.content}`);

        try {
            // Xác thực API Key
            this.sepayService.verifyWebhookAuth(authorization);

            // Xử lý webhook
            const result = await this.sepayService.handlePaymentWebhook(webhookDto);

            // Hủy scheduled expire nếu thanh toán thành công
            if (result.success && result.message === 'Payment processed successfully') {
                // Payment đã được xử lý, cancel scheduled jobs
                const payment = await this.sepayService.getPaymentByCode(
                    webhookDto.content.toUpperCase()
                );
                if (payment) {
                    this.paymentScheduler.cancelScheduledExpire(payment.id);
                    this.paymentScheduler.cancelScheduledCancel(payment.rental_contract_id);
                }
            }

            return { success: result.success };
        } catch (error: any) {
            this.logger.error(`Webhook error: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Lấy thông tin payment theo payment_code
     */
    @Get(':paymentCode')
    @ApiOperation({ summary: 'Lấy thông tin payment theo mã thanh toán' })
    @ApiParam({ name: 'paymentCode', description: 'Mã thanh toán (VD: GENHUB1702612345678)' })
    async getPayment(@Param('paymentCode') paymentCode: string) {
        this.logger.log(`Getting payment: paymentCode=${paymentCode}`);

        const payment = await this.sepayService.getPaymentByCode(paymentCode);
        if (!payment) {
            return {
                success: false,
                message: 'Payment not found',
            };
        }

        return {
            success: true,
            data: {
                paymentCode: payment.payment_code,
                amount: payment.amount,
                status: payment.status,
                qrCode: payment.qr_code,
                expiredAt: payment.expired_at,
                contractId: payment.rental_contract_id,
            },
        };
    }

    /**
     * Return URL sau khi thanh toán thành công
     * Frontend redirect user đến trang này
     */
    @Get('callback/success')
    @ApiOperation({ summary: 'Callback URL khi thanh toán thành công' })
    async handleSuccess(@Query() query: PaymentCallbackQueryDto) {
        this.logger.log(`Payment success callback: paymentCode=${query.paymentCode}`);

        if (query.paymentCode) {
            const payment = await this.sepayService.getPaymentByCode(query.paymentCode);
            return {
                success: true,
                message: 'Thanh toán thành công',
                data: payment ? {
                    paymentCode: payment.payment_code,
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
    @Get('callback/cancel')
    @ApiOperation({ summary: 'Callback URL khi hủy thanh toán' })
    async handleCancel(@Query() query: PaymentCallbackQueryDto) {
        this.logger.log(`Payment cancelled: paymentCode=${query.paymentCode}`);
        return { success: false, message: 'Đã hủy thanh toán' };
    }
}
