import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { SepayService } from './sepay.service';
import { PaymentSchedulerService } from './payment-scheduler.service';
import { PaymentCallbackQueryDto, SepayWebhookDto } from './dto';
import { ApiValidationErrorResponse } from '../../common/decorators';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly sepayService: SepayService,
    private readonly paymentScheduler: PaymentSchedulerService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook nhận thông tin thanh toán từ SePay',
    description:
      'Endpoint public để SePay gửi thông tin giao dịch về hệ thống. API xác thực bằng header `Authorization` theo định dạng `Apikey YOUR_API_KEY`, kiểm tra giao dịch trùng lặp, cập nhật trạng thái payment và kích hoạt logic nghiệp vụ liên quan.',
  })
  @ApiHeader({
    name: 'Authorization',
    required: true,
    description:
      'API key xác thực webhook theo định dạng `Apikey YOUR_API_KEY`.',
    example: 'Apikey sepay_live_xxxxxxxxxxxxxxxxx',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook được tiếp nhận và xử lý',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Payment processed successfully' },
      },
      example: {
        success: true,
        message: 'Payment processed successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'API key không hợp lệ hoặc thiếu header xác thực',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid API Key' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiValidationErrorResponse()
  async handleWebhook(
    @Body() webhookDto: SepayWebhookDto,
    @Headers('Authorization') authorization: string,
  ) {
    this.logger.log(
      `Received SePay webhook: id=${webhookDto.id}, content=${webhookDto.content}`,
    );

    try {
      this.sepayService.verifyWebhookAuth(authorization);
      const result = await this.sepayService.handlePaymentWebhook(webhookDto);

      if (
        result.success &&
        result.message === 'Payment processed successfully'
      ) {
        const payment = await this.sepayService.getPaymentByCode(
          webhookDto.content.toUpperCase(),
        );
        if (payment) {
          this.paymentScheduler.cancelScheduledExpire(payment.id);
          if (payment.rental_contract_id) {
            this.paymentScheduler.cancelScheduledCancel(
              payment.rental_contract_id,
            );
          }
        }
      }

      return { success: result.success, message: result.message };
    } catch (error: any) {
      this.logger.error(`Webhook error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  @Get(':paymentCode')
  @ApiOperation({
    summary: 'Lấy thông tin payment theo mã thanh toán',
    description:
      'Tra cứu thông tin payment bằng `paymentCode`, bao gồm số tiền, trạng thái thanh toán, QR code, thuế VAT và liên kết hợp đồng nếu có.',
  })
  @ApiParam({
    name: 'paymentCode',
    description: 'Mã thanh toán duy nhất của payment.',
    example: 'GENHUB1702612345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin payment thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            paymentCode: { type: 'string', example: 'GENHUB1702612345678' },
            amount: { type: 'number', example: 5000000 },
            vatAmount: {
              type: 'number',
              example: 500000,
              description: 'Thuế VAT',
            },
            status: { type: 'string', example: 'PENDING' },
            qrCode: { type: 'string', example: 'https://qr.sepay.vn/img?...' },
            expiredAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-13T09:00:00.000Z',
            },
            contractId: {
              type: 'string',
              nullable: true,
              example: '550e8400-e29b-41d4-a716-446655440010',
            },
          },
        },
      },
      example: {
        success: true,
        data: {
          paymentCode: 'GENHUB1702612345678',
          amount: 5000000,
          vatAmount: 500000,
          vat: 10,
          status: 'PENDING',
          qrCode: 'https://qr.sepay.vn/img?...',
          expiredAt: '2026-03-13T09:00:00.000Z',
          contractId: '550e8400-e29b-41d4-a716-446655440010',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy payment',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Payment not found' },
      },
    },
  })
  @Public()
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
        vatAmount: payment.vat_amount,
        vat: Number(this.configService.get<number>('RENTAL_VAT_RATE')) || 10,
        status: payment.status,
        qrCode: payment.qr_code,
        expiredAt: payment.expired_at,
        contractId: payment.rental_contract_id,
      },
    };
  }

  @Get('callback/success')
  @ApiOperation({
    summary: 'Callback URL khi thanh toán thành công',
    description:
      'Endpoint callback để frontend hoặc cổng thanh toán redirect người dùng sau khi giao dịch hoàn tất. Nếu có `paymentCode`, API trả về thêm thông tin payment tương ứng.',
  })
  @ApiQuery({
    name: 'paymentCode',
    required: false,
    type: String,
    description: 'Mã thanh toán được trả về từ cổng thanh toán.',
    example: 'GENHUB1702612345678',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Trạng thái callback từ cổng thanh toán.',
    example: 'SUCCESS',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về dữ liệu callback thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Thanh toán thành công' },
        data: {
          nullable: true,
          type: 'object',
          properties: {
            paymentCode: { type: 'string', example: 'GENHUB1702612345678' },
            amount: { type: 'number', example: 5000000 },
            status: { type: 'string', example: 'PAID' },
            contractId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440010',
            },
          },
        },
      },
    },
  })
  @ApiValidationErrorResponse()
  // @Public()
  async handleSuccess(@Query() query: PaymentCallbackQueryDto) {
    this.logger.log(
      `Payment success callback: paymentCode=${query.paymentCode}`,
    );

    if (query.paymentCode) {
      const payment = await this.sepayService.getPaymentByCode(
        query.paymentCode,
      );
      return {
        success: true,
        message: 'Thanh toán thành công',
        data: payment
          ? {
              paymentCode: payment.payment_code,
              amount: payment.amount,
              status: payment.status,
              contractId: payment.rental_contract_id,
            }
          : null,
      };
    }

    return { success: true, message: 'Thanh toán thành công' };
  }

  @Get('callback/cancel')
  @ApiOperation({
    summary: 'Callback URL khi hủy thanh toán',
    description:
      'Endpoint callback khi người dùng hủy giao dịch tại cổng thanh toán hoặc quay lại từ trang thanh toán thất bại.',
  })
  @ApiQuery({
    name: 'paymentCode',
    required: false,
    type: String,
    description: 'Mã thanh toán được trả về từ cổng thanh toán.',
    example: 'GENHUB1702612345678',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Trạng thái callback từ cổng thanh toán.',
    example: 'CANCELLED',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về trạng thái callback hủy thanh toán',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Đã hủy thanh toán' },
      },
      example: {
        success: false,
        message: 'Đã hủy thanh toán',
      },
    },
  })
  @ApiValidationErrorResponse()
  // @Public()
  async handleCancel(@Query() query: PaymentCallbackQueryDto) {
    this.logger.log(`Payment cancelled: paymentCode=${query.paymentCode}`);
    return { success: false, message: 'Đã hủy thanh toán' };
  }
}
