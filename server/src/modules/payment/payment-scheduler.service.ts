import {
    Injectable,
    OnModuleInit,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, ContractStatus } from '@prisma/client';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

/**
 * Payment Scheduler Service
 * Tự động xử lý khi payment/contract hết hạn
 *
 * Logic:
 * - Khi server khởi động, kiểm tra tất cả payments/contracts PENDING
 * - Nếu expired_at <= now: xử lý expire ngay
 * - Nếu expired_at > now: lên lịch timeout
 */
@Injectable()
export class PaymentSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PaymentSchedulerService.name);
    private readonly contractPendingExpireHours: number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly configService: ConfigService,
        private readonly systemLogService: SystemLogService,
        private readonly websocketGateway: WebsocketGateway,
    ) {
        this.contractPendingExpireHours = this.configService.get<number>('CONTRACT_PENDING_EXPIRE_HOURS') || 24;
    }

    async onModuleInit() {
        await this.processExistingPayments();
        await this.processExistingContracts();
    }

    onModuleDestroy() {
        // Clear all scheduled timeouts
        const timeouts = this.schedulerRegistry.getTimeouts();
        timeouts.forEach((name) => {
            if (name.startsWith('payment_expire_') || name.startsWith('contract_cancel_')) {
                this.schedulerRegistry.deleteTimeout(name);
            }
        });
    }

    /**
     * Xử lý payments PENDING khi server khởi động
     */
    async processExistingPayments(): Promise<void> {
        try {
            const pendingPayments = await this.prisma.payment.findMany({
                where: {
                    status: PaymentStatus.PENDING,
                    is_deleted: false,
                    expired_at: { not: null },
                },
            });

            if (pendingPayments.length === 0) return;

            const now = new Date();
            let expiredCount = 0;
            let scheduledCount = 0;

            for (const payment of pendingPayments) {
                if (!payment.expired_at) continue;

                const expiredAt = new Date(payment.expired_at);

                if (expiredAt <= now) {
                    await this.expirePayment(payment.id);
                    expiredCount++;
                } else {
                    this.schedulePaymentExpire(payment.id, expiredAt, payment.created_by || '');
                    scheduledCount++;
                }
            }

            if (expiredCount > 0 || scheduledCount > 0) {
                this.logger.log(
                    `✅ Payment scheduler: ${expiredCount} expired, ${scheduledCount} scheduled`,
                );
            }
        } catch (error) {
            this.logger.error('❌ Error processing existing payments:', error);
        }
    }

    /**
     * Xử lý contracts PENDING khi server khởi động
     */
    async processExistingContracts(): Promise<void> {
        try {
            const pendingContracts = await this.prisma.rentalContract.findMany({
                where: {
                    status: ContractStatus.PENDING,
                    is_deleted: false,
                },
            });

            if (pendingContracts.length === 0) return;

            const now = new Date();
            let cancelledCount = 0;
            let scheduledCount = 0;

            for (const contract of pendingContracts) {
                const cancelAt = new Date(contract.created_at);
                cancelAt.setHours(cancelAt.getHours() + this.contractPendingExpireHours);

                if (cancelAt <= now) {
                    // Kiểm tra xem có payment nào PENDING không
                    const hasPendingPayment = await this.prisma.payment.findFirst({
                        where: {
                            rental_contract_id: contract.id,
                            status: PaymentStatus.PENDING,
                        },
                    });

                    if (!hasPendingPayment) {
                        await this.cancelContract(contract.id);
                        cancelledCount++;
                    }
                } else {
                    this.scheduleContractCancel(contract.id, cancelAt, contract.created_by || '');
                    scheduledCount++;
                }
            }

            if (cancelledCount > 0 || scheduledCount > 0) {
                this.logger.log(
                    `✅ Contract scheduler: ${cancelledCount} cancelled, ${scheduledCount} scheduled`,
                );
            }
        } catch (error) {
            this.logger.error('❌ Error processing existing contracts:', error);
        }
    }

    /**
     * Lên lịch expire payment
     */
    schedulePaymentExpire(paymentId: string, expiredAt: Date, userId: string): void {
        const now = new Date();
        const delay = expiredAt.getTime() - now.getTime();

        if (delay <= 0) {
            this.expirePayment(paymentId);
            return;
        }

        const timeoutName = `payment_expire_${paymentId}`;

        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch {
            // Timeout không tồn tại
        }

        const timeout = setTimeout(async () => {
            await this.expirePayment(paymentId);
            try {
                this.schedulerRegistry.deleteTimeout(timeoutName);
            } catch {
                // Ignore
            }
        }, delay);

        this.schedulerRegistry.addTimeout(timeoutName, timeout);
    }

    /**
     * Lên lịch cancel contract
     */
    scheduleContractCancel(contractId: string, cancelAt: Date, userId: string): void {
        const now = new Date();
        const delay = cancelAt.getTime() - now.getTime();

        if (delay <= 0) {
            this.cancelContract(contractId);
            return;
        }

        const timeoutName = `contract_cancel_${contractId}`;

        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch {
            // Timeout không tồn tại
        }

        const timeout = setTimeout(async () => {
            await this.cancelContract(contractId);
            try {
                this.schedulerRegistry.deleteTimeout(timeoutName);
            } catch {
                // Ignore
            }
        }, delay);

        this.schedulerRegistry.addTimeout(timeoutName, timeout);
    }

    /**
     * Expire payment
     */
    async expirePayment(paymentId: string): Promise<void> {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
            });

            if (!payment || payment.status !== PaymentStatus.PENDING) {
                return;
            }

            await this.prisma.payment.update({
                where: { id: paymentId },
                data: { status: PaymentStatus.EXPIRED },
            });

            // Emit socket event
            if (payment.created_by) {
                this.websocketGateway.server.to(`user:${payment.created_by}`).emit('payment:expired', {
                    paymentId: payment.id,
                    contractId: payment.rental_contract_id,
                });
            }

            this.logger.log(`✅ Payment ${payment.payment_code} expired`);
            this.systemLogService.info('payment-scheduler', 'expire',
                `Payment expired: ${payment.payment_code}`, { metaData: { paymentId } });
        } catch (error) {
            this.logger.error(`❌ Failed to expire payment ${paymentId}:`, error);
        }
    }

    /**
     * Cancel contract
     */
    async cancelContract(contractId: string): Promise<void> {
        try {
            const contract = await this.prisma.rentalContract.findUnique({
                where: { id: contractId },
            });

            if (!contract || contract.status !== ContractStatus.PENDING) {
                return;
            }

            // Kiểm tra còn payment PENDING không
            const hasPendingPayment = await this.prisma.payment.findFirst({
                where: {
                    rental_contract_id: contractId,
                    status: PaymentStatus.PENDING,
                },
            });

            if (hasPendingPayment) {
                // Còn payment PENDING, không cancel
                return;
            }

            await this.prisma.rentalContract.update({
                where: { id: contractId },
                data: { status: ContractStatus.CANCELLED },
            });

            // Emit socket event
            if (contract.created_by) {
                this.websocketGateway.server.to(`user:${contract.created_by}`).emit('contract:cancelled', {
                    contractId: contract.id,
                    code: contract.code,
                    reason: 'Payment timeout',
                });
            }

            this.logger.log(`✅ Contract ${contract.code} cancelled due to payment timeout`);
            this.systemLogService.info('payment-scheduler', 'cancel-contract',
                `Contract cancelled: ${contract.code}`, { metaData: { contractId } });
        } catch (error) {
            this.logger.error(`❌ Failed to cancel contract ${contractId}:`, error);
        }
    }

    /**
     * Hủy lịch expire payment (khi thanh toán thành công)
     */
    cancelScheduledExpire(paymentId: string): void {
        const timeoutName = `payment_expire_${paymentId}`;
        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch {
            // Timeout không tồn tại
        }
    }

    /**
     * Hủy lịch cancel contract (khi thanh toán thành công)
     */
    cancelScheduledCancel(contractId: string): void {
        const timeoutName = `contract_cancel_${contractId}`;
        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch {
            // Timeout không tồn tại
        }
    }
}
