import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
    ICreatePaymentLinkOptions,
    IPayOSCreatePaymentResponse,
    IPayOSWebhook,
    IPaymentResult,
} from './interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { SystemLogService } from '../system-log/system-log.service';

/**
 * Service xử lý tích hợp PayOS payment gateway
 */
@Injectable()
export class PayosService {
    private readonly logger = new Logger(PayosService.name);
    private readonly PAYOS_API_URL = 'https://api-merchant.payos.vn';
    private readonly clientId: string;
    private readonly apiKey: string;
    private readonly checksumKey: string;
    private readonly returnUrl: string;
    private readonly cancelUrl: string;
    private readonly lockDurationHours: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly systemLogService: SystemLogService,
    ) {
        this.clientId = this.configService.get<string>('PAYOS_CLIENT_ID') || '';
        this.apiKey = this.configService.get<string>('PAYOS_API_KEY') || '';
        this.checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY') || '';
        this.returnUrl = this.configService.get<string>('PAYOS_RETURN_URL') ||
            `${this.configService.get<string>('FRONTEND_URL')}/payment/success`;
        this.cancelUrl = this.configService.get<string>('PAYOS_CANCEL_URL') ||
            `${this.configService.get<string>('FRONTEND_URL')}/payment/cancel`;
        this.lockDurationHours = this.configService.get<number>('RENTAL_LOCK_DURATION_HOURS') || 1;
    }

    /**
     * Generate unique order code (must be unique number for PayOS)
     */
    private generateOrderCode(): number {
        // Sử dụng timestamp + random để đảm bảo unique
        const timestamp = Date.now() % 1000000000; // 9 digits max
        const random = Math.floor(Math.random() * 1000); // 3 digits
        return parseInt(`${timestamp}${random.toString().padStart(3, '0')}`);
    }

    /**
     * Tạo signature cho PayOS request
     */
    private createSignature(data: Record<string, unknown>): string {
        // Sort theo alphabet và tạo query string
        const sortedKeys = Object.keys(data).sort();
        const signData = sortedKeys.map(key => `${key}=${data[key]}`).join('&');

        // HMAC SHA256
        return crypto
            .createHmac('sha256', this.checksumKey)
            .update(signData)
            .digest('hex');
    }

    /**
     * Verify webhook signature từ PayOS
     */
    verifyWebhookSignature(webhookData: IPayOSWebhook): boolean {
        if (!webhookData.data || !webhookData.signature) {
            return false;
        }

        const dataToSign = {
            orderCode: webhookData.data.orderCode,
            amount: webhookData.data.amount,
            description: webhookData.data.description,
            accountNumber: webhookData.data.accountNumber,
            reference: webhookData.data.reference,
            transactionDateTime: webhookData.data.transactionDateTime,
            currency: webhookData.data.currency,
            paymentLinkId: webhookData.data.paymentLinkId,
            code: webhookData.data.code,
            desc: webhookData.data.desc,
            counterAccountBankId: webhookData.data.counterAccountBankId || '',
            counterAccountBankName: webhookData.data.counterAccountBankName || '',
            counterAccountName: webhookData.data.counterAccountName || '',
            counterAccountNumber: webhookData.data.counterAccountNumber || '',
            virtualAccountName: webhookData.data.virtualAccountName || '',
            virtualAccountNumber: webhookData.data.virtualAccountNumber || '',
        };

        const calculatedSignature = this.createSignature(dataToSign);
        return calculatedSignature === webhookData.signature;
    }

    /**
     * Tạo payment link với PayOS
     */
    async createPaymentLink(
        options: ICreatePaymentLinkOptions,
    ): Promise<IPayOSCreatePaymentResponse> {
        const signatureData = {
            amount: options.amount,
            cancelUrl: options.cancelUrl,
            description: options.description,
            orderCode: options.orderCode,
            returnUrl: options.returnUrl,
        };
        const signature = this.createSignature(signatureData);

        const requestBody = {
            orderCode: options.orderCode,
            amount: options.amount,
            description: options.description,
            items: options.items || [],
            cancelUrl: options.cancelUrl,
            returnUrl: options.returnUrl,
            expiredAt: options.expiredAt,
            signature,
            buyerName: options.buyerName,
            buyerEmail: options.buyerEmail,
            buyerPhone: options.buyerPhone,
        };

        const response = await fetch(`${this.PAYOS_API_URL}/v2/payment-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': this.clientId,
                'x-api-key': this.apiKey,
            },
            body: JSON.stringify(requestBody),
        });

        const result = (await response.json()) as IPayOSCreatePaymentResponse;

        if (result.code !== '00') {
            this.systemLogService.error('payment', 'create_payment_link',
                `PayOS error: ${result.desc}`, { metaData: { orderCode: options.orderCode } });
            throw new BadRequestException(`PayOS error: ${result.desc}`);
        }

        return result;
    }

    /**
     * Tạo payment cho hợp đồng thuê mới
     */
    async createContractPayment(
        rentalContractId: string,
        amount: number,
        description: string,
        type: PaymentType,
        userId: string,
    ): Promise<IPaymentResult> {
        const orderCode = this.generateOrderCode();

        // Tính thời gian hết hạn = now + RENTAL_LOCK_DURATION_HOURS
        const expiredAt = new Date();
        expiredAt.setHours(expiredAt.getHours() + this.lockDurationHours);
        const expiredAtUnix = Math.floor(expiredAt.getTime() / 1000);

        // Gọi PayOS API để tạo payment link
        const payosResponse = await this.createPaymentLink({
            orderCode,
            amount,
            description: description.substring(0, 25), // PayOS giới hạn 25 ký tự cho non-linked accounts
            cancelUrl: this.cancelUrl,
            returnUrl: this.returnUrl,
            expiredAt: expiredAtUnix,
        });

        // Lưu payment vào database
        const payment = await this.prisma.payment.create({
            data: {
                rental_contract_id: rentalContractId,
                order_code: orderCode,
                amount,
                description,
                type,
                status: PaymentStatus.PENDING,
                payment_link_id: payosResponse.data.paymentLinkId,
                checkout_url: payosResponse.data.checkoutUrl,
                qr_code: payosResponse.data.qrCode,
                expired_at: expiredAt,
                created_by: userId,
            },
        });

        this.systemLogService.info('payment', 'create',
            `Created payment for contract: ${rentalContractId}`,
            { userId, metaData: { paymentId: payment.id, orderCode, amount } });

        return {
            paymentId: payment.id,
            orderCode,
            amount,
            checkoutUrl: payosResponse.data.checkoutUrl,
            qrCode: payosResponse.data.qrCode,
            status: 'PENDING',
            expiredAt,
        };
    }

    /**
     * Xử lý webhook từ PayOS khi thanh toán thành công
     */
    async handlePaymentWebhook(webhookData: IPayOSWebhook): Promise<void> {
        // Verify signature
        if (!this.verifyWebhookSignature(webhookData)) {
            this.systemLogService.error('payment', 'webhook', 'Invalid webhook signature',
                { metaData: { orderCode: webhookData.data?.orderCode } });
            throw new BadRequestException('Invalid webhook signature');
        }

        const orderCode = webhookData.data.orderCode;

        // Tìm payment theo order_code
        const payment = await this.prisma.payment.findUnique({
            where: { order_code: orderCode },
            include: { rental_contract: true },
        });

        if (!payment) {
            this.systemLogService.error('payment', 'webhook', 'Payment not found',
                { metaData: { orderCode } });
            throw new BadRequestException('Payment not found');
        }

        // Cập nhật payment status = PAID
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.PAID,
                paid_at: new Date(),
            },
        });

        // Cập nhật rental contract status = ACTIVE (nếu là NEW_CONTRACT)
        if (payment.type === PaymentType.NEW_CONTRACT) {
            await this.prisma.rentalContract.update({
                where: { id: payment.rental_contract_id },
                data: {
                    status: 'ACTIVE',
                },
            });
        }

        // Nếu là RENEWAL, cập nhật expired_at của contract
        // (Logic này sẽ được handle trong rental-contract service)

        this.systemLogService.info('payment', 'webhook',
            `Payment completed: ${orderCode}`,
            { metaData: { paymentId: payment.id, orderCode } });
    }

    /**
     * Lấy thông tin payment theo order_code
     */
    async getPaymentByOrderCode(orderCode: number) {
        return this.prisma.payment.findUnique({
            where: { order_code: orderCode },
            include: { rental_contract: true },
        });
    }

    /**
     * Hủy payment link
     */
    async cancelPaymentLink(orderCode: number): Promise<void> {
        const response = await fetch(`${this.PAYOS_API_URL}/v2/payment-requests/${orderCode}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': this.clientId,
                'x-api-key': this.apiKey,
            },
            body: JSON.stringify({ cancellationReason: 'User cancelled' }),
        });

        const result = await response.json();

        if (result.code !== '00') {
            this.systemLogService.error('payment', 'cancel',
                `Failed to cancel payment: ${result.desc}`, { metaData: { orderCode } });
        }

        // Cập nhật status trong DB
        await this.prisma.payment.update({
            where: { order_code: orderCode },
            data: { status: PaymentStatus.CANCELLED },
        });
    }
}
