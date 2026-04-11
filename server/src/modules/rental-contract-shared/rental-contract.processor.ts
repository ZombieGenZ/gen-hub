import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { SepayService } from '../payment/sepay.service';
import { PaymentSchedulerService } from '../payment/payment-scheduler.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';
import { ContractStatus, PaymentStatus } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';

/**
 * Job data interfaces
 */
export interface CreateContractJobData {
    dto: any;
    userId: string;
    organizationId: string;
    lang: string;
}

export interface RenewContractJobData {
    contractId: string;
    adjustMonths: number;
    userId: string;
    organizationId: string;
    lang: string;
}

export interface RetryPaymentJobData {
    contractId: string;
    userId: string;
    organizationId: string;
    lang: string;
}

/**
 * Processor xử lý các jobs liên quan đến rental contract
 * Đảm bảo data integrity cho create, renew, retry payment
 */
@Processor('rental-contract')
@Injectable()
export class RentalContractProcessor {
    private readonly logger = new Logger(RentalContractProcessor.name);
    private readonly contractPendingExpireSeconds: number;
    private readonly lockDurationSeconds: number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly sepayService: SepayService,
        private readonly paymentScheduler: PaymentSchedulerService,
        private readonly systemLogService: SystemLogService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.contractPendingExpireSeconds = this.configService.get<number>('CONTRACT_PENDING_EXPIRE_SECONDS') || 86400;
        this.lockDurationSeconds = this.configService.get<number>('RENTAL_LOCK_DURATION_SECONDS') || 3600;
    }

    /**
     * Xử lý tạo hợp đồng mới
     */
    @Process('create-contract')
    async handleCreateContract(job: Job<CreateContractJobData>) {
        const { dto, userId, organizationId, lang } = job.data;
        this.logger.log(`Processing create-contract job: ${job.id}`);

        try {
            // Logic tạo contract sẽ được gọi từ service
            // Processor chỉ đảm bảo atomic operation
            return { success: true, jobId: job.id };
        } catch (error: any) {
            this.logger.error(`Failed to process create-contract job: ${error.message}`);
            throw error;
        }
    }

    /**
     * Xử lý gia hạn hợp đồng
     */
    @Process('renew-contract')
    async handleRenewContract(job: Job<RenewContractJobData>) {
        const { contractId, adjustMonths, userId, organizationId, lang } = job.data;
        this.logger.log(`Processing renew-contract job: ${job.id} for contract ${contractId}`);

        try {
            // Tìm contract
            const contract = await this.prisma.rentalContract.findUnique({
                where: { id: contractId },
                include: { details: true },
            });

            if (!contract) {
                throw new NotFoundException(
                    await this.i18n.t('rental-contract.errors.not_found', { lang }),
                );
            }

            // Chỉ cho phép gia hạn contract ACTIVE
            if (contract.status !== ContractStatus.ACTIVE) {
                throw new BadRequestException(
                    await this.i18n.t('rental-contract.errors.not_active', { lang }),
                );
            }

            // Tính giá gia hạn
            const renewalDays = adjustMonths * 30;
            let renewalPrice = 0;
            for (const detail of contract.details) {
                renewalPrice += parseFloat(detail.price_per_month.toString()) * adjustMonths;
            }

            // Tạo payment cho gia hạn
            const paymentResult = await this.sepayService.createContractPayment({
                rentalContractId: contractId,
                amount: Math.round(renewalPrice),
                description: `Gia hạn ${contract.code}`,
                type: 'RENEWAL',
                userId,
            });

            // Schedule payment expire
            const expiredAt = new Date();
            expiredAt.setSeconds(expiredAt.getSeconds() + this.lockDurationSeconds);
            this.paymentScheduler.schedulePaymentExpire(paymentResult.paymentId, expiredAt, userId);

            // Emit socket event
            this.websocketGateway.server.to(`user:${userId}`).emit('contract:renewed', {
                contractId: contract.id,
                code: contract.code,
                adjustMonths,
                paymentCode: paymentResult.paymentCode,
                qrCode: paymentResult.qrCode,
            });

            this.systemLogService.info('rental-contract', 'renew',
                `Created renewal payment for contract: ${contract.code}`,
                { userId, metaData: { contractId, adjustMonths, paymentId: paymentResult.paymentId } });

            return {
                success: true,
                contractId,
                payment: paymentResult,
            };
        } catch (error: any) {
            this.logger.error(`Failed to process renew-contract job: ${error.message}`);
            throw error;
        }
    }

    /**
     * Xử lý tạo lại link thanh toán
     */
    @Process('retry-payment')
    async handleRetryPayment(job: Job<RetryPaymentJobData>) {
        const { contractId, userId, organizationId, lang } = job.data;
        this.logger.log(`Processing retry-payment job: ${job.id} for contract ${contractId}`);

        try {
            // Tìm contract
            const contract = await this.prisma.rentalContract.findUnique({
                where: { id: contractId },
                include: { details: true, payments: true },
            });

            if (!contract) {
                throw new NotFoundException(
                    await this.i18n.t('rental-contract.errors.not_found', { lang }),
                );
            }

            // Chỉ cho phép retry cho contract PENDING
            if (contract.status !== ContractStatus.PENDING) {
                throw new BadRequestException(
                    await this.i18n.t('rental-contract.errors.cannot_retry_non_pending', { lang }),
                );
            }

            // Kiểm tra payment hiện tại
            let currentPayment = contract.payments.find(p => p.status === PaymentStatus.PENDING);
            const now = new Date();

            if (currentPayment?.expired_at && now >= currentPayment.expired_at) {
                await this.paymentScheduler.expirePayment(currentPayment.id);
                currentPayment = undefined;
            }

            if (currentPayment && currentPayment.expired_at && now < currentPayment.expired_at) {
                throw new BadRequestException(
                    await this.i18n.t('rental-contract.errors.payment_still_active', { lang }),
                );
            }

            // Kiểm tra templates không bị block bởi user khác
            // (Logic check block sẽ được implement trong service chính)

            // Đánh dấu payment cũ là EXPIRED
            if (currentPayment) {
                await this.prisma.payment.update({
                    where: { id: currentPayment.id },
                    data: { status: PaymentStatus.EXPIRED },
                });
                this.paymentScheduler.cancelScheduledExpire(currentPayment.id);
            }

            // Tạo payment mới
            const paymentResult = await this.sepayService.createContractPayment({
                rentalContractId: contractId,
                amount: Math.round(parseFloat(contract.final_price.toString())),
                description: contract.code,
                type: 'NEW_CONTRACT',
                userId,
            });

            // Schedule payment expire
            const expiredAt = new Date();
            expiredAt.setSeconds(expiredAt.getSeconds() + this.lockDurationSeconds);
            this.paymentScheduler.schedulePaymentExpire(paymentResult.paymentId, expiredAt, userId);

            this.systemLogService.info('rental-contract', 'retry-payment',
                `Created retry payment for contract: ${contract.code}`,
                { userId, metaData: { contractId, paymentId: paymentResult.paymentId } });

            return {
                success: true,
                contractId,
                payment: paymentResult,
            };
        } catch (error: any) {
            this.logger.error(`Failed to process retry-payment job: ${error.message}`);
            throw error;
        }
    }
}
