import { Injectable, Logger, BadRequestException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISepayWebhookData, IPaymentResult, ICreatePaymentOptions } from './interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, PaymentType, PaymentPurpose } from '@prisma/client';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RentalContractService } from '../rental-contract/rental-contract.service';
import { OrganizationBalanceService } from '../organization-balance/organization-balance.service';
import { ContactListService } from '../contact-list/contact-list.service';

/**
 * Service xử lý tích hợp SePay payment gateway
 */
@Injectable()
export class SepayService {
    private readonly logger = new Logger(SepayService.name);
    private readonly SEPAY_QR_URL = 'https://qr.sepay.vn/img';

    private readonly accountNumber: string;
    private readonly bankName: string;
    private readonly accountHolder: string;
    private readonly apiKey: string;
    private readonly paymentCodePrefix: string;
    private readonly paymentCodeLength: number;
    private readonly lockDurationSeconds: number;

    // Ký tự được phép trong payment code: chữ viết hoa + số
    private readonly ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly systemLogService: SystemLogService,
        private readonly websocketGateway: WebsocketGateway,
        @Inject(forwardRef(() => RentalContractService))
        private readonly rentalContractService: RentalContractService,
        @Inject(forwardRef(() => OrganizationBalanceService))
        private readonly organizationBalanceService: OrganizationBalanceService,
        private readonly contactListService: ContactListService,
    ) {
        this.accountNumber = this.configService.get<string>('SEPAY_ACCOUNT_NUMBER') || '';
        this.bankName = this.configService.get<string>('SEPAY_BANK_NAME') || '';
        this.accountHolder = this.configService.get<string>('SEPAY_ACCOUNT_HOLDER') || '';
        this.apiKey = this.configService.get<string>('SEPAY_API_KEY') || '';
        this.paymentCodePrefix = this.configService.get<string>('PAYMENT_CODE_PREFIX') || 'GENHUB';
        this.paymentCodeLength = this.configService.get<number>('PAYMENT_CODE_LENGTH') || 8;
        this.lockDurationSeconds = this.configService.get<number>('RENTAL_LOCK_DURATION_SECONDS') || 3600;
    }

    /**
     * Tạo mã thanh toán unique với định dạng: PREFIX + random alphanumeric (uppercase + numbers)
     */
    generatePaymentCode(): string {
        let randomPart = '';
        for (let i = 0; i < this.paymentCodeLength; i++) {
            const randomIndex = Math.floor(Math.random() * this.ALPHANUMERIC_CHARS.length);
            randomPart += this.ALPHANUMERIC_CHARS[randomIndex];
        }
        return `${this.paymentCodePrefix}${randomPart}`;
    }

    /**
     * Tạo URL QR code từ qr.sepay.vn
     */
    generateQRUrl(paymentCode: string, amount: number): string {
        const params = new URLSearchParams({
            acc: this.accountNumber,
            bank: this.bankName,
            amount: amount.toString(),
            des: paymentCode,
        });
        return `${this.SEPAY_QR_URL}?${params.toString()}`;
    }

    /**
     * Xác thực webhook từ SePay qua API Key
     */
    verifyWebhookAuth(authHeader: string): void {
        const expectedKey = `Apikey ${this.apiKey}`;
        if (authHeader !== expectedKey) {
            this.systemLogService.error('payment', 'webhook_auth', 'Invalid API Key', {});
            throw new UnauthorizedException('Invalid API Key');
        }
    }

    /**
     * Kiểm tra giao dịch trùng lặp
     */
    async isDuplicateTransaction(sepayTransactionId: number): Promise<boolean> {
        const existing = await this.prisma.payment.findUnique({
            where: { sepay_transaction_id: BigInt(sepayTransactionId) },
        });
        return !!existing;
    }

    /**
     * Tạo payment cho hợp đồng
     */
    async createContractPayment(options: ICreatePaymentOptions): Promise<IPaymentResult> {
        const paymentCode = this.generatePaymentCode();

        // Tính thời gian hết hạn
        const expiredAt = new Date();
        expiredAt.setSeconds(expiredAt.getSeconds() + this.lockDurationSeconds);

        // Tạo QR URL
        const qrCode = this.generateQRUrl(paymentCode, options.amount);

        // Lưu payment vào database
        const payment = await this.prisma.payment.create({
            data: {
                rental_contract_id: options.rentalContractId,
                payment_code: paymentCode,
                amount: options.amount,
                description: options.description,
                type: options.type as PaymentType,
                purpose: 'RENTAL_CONTRACT_NEW',
                status: PaymentStatus.PENDING,
                qr_code: qrCode,
                expired_at: expiredAt,
                created_by: options.userId,
            },
        });

        this.systemLogService.info('payment', 'create',
            `Created SePay payment for contract: ${options.rentalContractId}`,
            { userId: options.userId, metaData: { paymentId: payment.id, paymentCode, amount: options.amount } });

        // Emit socket event
        this.websocketGateway.server.to(`user:${options.userId}`).emit('payment:created', {
            paymentId: payment.id,
            contractId: options.rentalContractId,
            paymentCode,
            amount: options.amount,
            qrCode,
            expiredAt,
            type: options.type,
        });

        return {
            paymentId: payment.id,
            paymentCode,
            amount: options.amount,
            qrCode,
            status: 'PENDING',
            expiredAt,
            bankInfo: {
                accountNumber: this.accountNumber,
                bankName: this.bankName,
                accountHolder: this.accountHolder,
                transferContent: paymentCode,
            },
        };
    }

    /**
     * Tạo payment cho nạp tiền vào tài khoản tổ chức
     */
    async createDepositPayment(options: {
        organizationId: string;
        userId: string;
        amount: number;
        notes?: string;
    }): Promise<IPaymentResult> {
        const paymentCode = this.generatePaymentCode();

        // Lấy thời gian hết hạn từ env (mặc định 10 phút)
        const expireMinutes = this.configService.get<number>('DEPOSIT_PAYMENT_EXPIRE_MINUTES') || 10;
        const expiredAt = new Date();
        expiredAt.setMinutes(expiredAt.getMinutes() + expireMinutes);

        // Tạo QR URL
        const qrCode = this.generateQRUrl(paymentCode, options.amount);

        // Lưu payment vào database
        const payment = await this.prisma.payment.create({
            data: {
                organization_id: options.organizationId,
                payment_code: paymentCode,
                amount: options.amount,
                description: options.notes || `Nạp tiền vào tài khoản tổ chức - ${paymentCode}`,
                type: PaymentType.ACCOUNT_DEPOSIT,
                purpose: 'ACCOUNT_DEPOSIT',
                status: PaymentStatus.PENDING,
                qr_code: qrCode,
                expired_at: expiredAt,
                created_by: options.userId,
            },
        });

        this.systemLogService.info('payment', 'create_deposit',
            `Created deposit payment for organization: ${options.organizationId}`,
            { userId: options.userId, metaData: { paymentId: payment.id, paymentCode, amount: options.amount, organizationId: options.organizationId } });

        // Emit socket event
        this.websocketGateway.server.to(`organization:${options.organizationId}`).emit('deposit:created', {
            paymentId: payment.id,
            paymentCode,
            amount: options.amount,
            qrCode,
            expiredAt,
        });

        return {
            paymentId: payment.id,
            paymentCode,
            amount: options.amount,
            qrCode,
            status: 'PENDING',
            expiredAt,
            bankInfo: {
                accountNumber: this.accountNumber,
                bankName: this.bankName,
                accountHolder: this.accountHolder,
                transferContent: paymentCode,
            },
        };
    }


    /**
     * Xử lý webhook từ SePay
     */
    async handlePaymentWebhook(webhookData: ISepayWebhookData): Promise<{ success: boolean; message: string }> {
        // Chỉ xử lý giao dịch tiền vào
        if (webhookData.transferType !== 'in') {
            return { success: true, message: 'Ignored outgoing transaction' };
        }

        // Kiểm tra trùng lặp
        if (await this.isDuplicateTransaction(webhookData.id)) {
            this.logger.warn(`Duplicate transaction: ${webhookData.id}`);
            return { success: true, message: 'Duplicate transaction ignored' };
        }

        // Tìm payment theo content (nội dung chuyển khoản chứa payment_code)
        const payment = await this.findPaymentByContent(webhookData.content);
        if (!payment) {
            this.logger.warn(`Payment not found for content: ${webhookData.content}`);
            return { success: true, message: 'Payment not found' };
        }

        // Kiểm tra payment đã hết hạn chưa
        if (payment.expired_at && new Date() > payment.expired_at) {
            this.systemLogService.warn('payment', 'webhook',
                `Payment expired: ${payment.payment_code}`,
                { metaData: { paymentId: payment.id } });
            return { success: false, message: 'Payment expired' };
        }

        // Kiểm tra số tiền
        if (webhookData.transferAmount < payment.amount) {
            this.systemLogService.warn('payment', 'webhook',
                `Insufficient amount: expected ${payment.amount}, got ${webhookData.transferAmount}`,
                { metaData: { paymentId: payment.id } });
            return { success: false, message: 'Insufficient amount' };
        }

        // Cập nhật payment status = PAID
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.PAID,
                paid_at: new Date(webhookData.transactionDate),
                sepay_transaction_id: BigInt(webhookData.id),
            },
        });

        // Xử lý theo loại payment
        if (payment.type === PaymentType.ACCOUNT_DEPOSIT) {
            // Nạp tiền vào tài khoản tổ chức
            const organizationId = payment.organization_id;
            if (organizationId) {
                await this.organizationBalanceService.processDepositSuccess(
                    organizationId,
                    payment.amount,
                    payment.id,
                    payment.payment_code,
                    payment.created_by,
                );
            }
        } else if (payment.type === PaymentType.NEW_CONTRACT && payment.rental_contract_id) {
            // Cập nhật rental contract status = ACTIVE
            await this.prisma.rentalContract.update({
                where: { id: payment.rental_contract_id },
                data: { status: 'ACTIVE' },
            });

            // Hủy các contracts PENDING xung đột
            await this.rentalContractService.cancelConflictingContracts(payment.rental_contract_id);

            // Emit socket contract:activated
            const contract = await this.prisma.rentalContract.findUnique({
                where: { id: payment.rental_contract_id },
            });
            if (contract) {
                this.websocketGateway.server.to(`user:${payment.created_by}`).emit('contract:activated', {
                    contractId: contract.id,
                    code: contract.code,
                });
            }
        }

        // Emit socket payment:paid
        this.websocketGateway.server.to(`user:${payment.created_by}`).emit('payment:paid', {
            paymentId: payment.id,
            contractId: payment.rental_contract_id,
            paidAt: new Date(webhookData.transactionDate),
        });

        this.systemLogService.info('payment', 'webhook',
            `Payment completed: ${payment.payment_code}`,
            { metaData: { paymentId: payment.id, sepayTransactionId: webhookData.id } });

        // Tự động thêm user vào whitelist sau khi thanh toán thành công
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: payment.created_by },
                select: { email: true }
            });

            if (user?.email) {
                await this.contactListService.addToWhitelist(
                    user.email,
                    `Auto whitelist after successful payment: ${payment.payment_code}`,
                    'SYSTEM_PAYMENT'
                );
            }
        } catch (error) {
            this.systemLogService.error('payment', 'auto_whitelist',
                `Failed to auto whitelist user ${payment.created_by}: ${error.message}`,
                { metaData: { paymentId: payment.id } });
        }

        return { success: true, message: 'Payment processed successfully' };
    }

    /**
     * Tìm payment theo nội dung chuyển khoản
     */
    private async findPaymentByContent(content: string): Promise<any> {
        // Tìm payment_code trong nội dung (content có thể chứa payment_code)
        const payments = await this.prisma.payment.findMany({
            where: {
                status: PaymentStatus.PENDING,
                is_deleted: false,
            },
            include: { rental_contract: true },
        });

        // Tìm payment có payment_code xuất hiện trong content
        const upperContent = content.toUpperCase();
        for (const payment of payments) {
            if (upperContent.includes(payment.payment_code.toUpperCase())) {
                return payment;
            }
        }

        return null;
    }

    /**
     * Lấy thông tin payment theo payment_code
     */
    async getPaymentByCode(paymentCode: string) {
        return this.prisma.payment.findUnique({
            where: { payment_code: paymentCode },
            include: { rental_contract: true },
        });
    }

    /**
     * Đánh dấu payment hết hạn
     */
    async expirePayment(paymentId: string): Promise<void> {
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
        this.websocketGateway.server.to(`user:${payment.created_by}`).emit('payment:expired', {
            paymentId: payment.id,
            contractId: payment.rental_contract_id,
        });

        this.systemLogService.info('payment', 'expire',
            `Payment expired: ${payment.payment_code}`,
            { metaData: { paymentId } });
    }

    /**
     * Lấy danh sách tất cả payments (Admin only)
     */
    async findAllPayments(query: {
        limit?: number;
        offset?: number;
        keywords?: string;
        status?: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
        organizationId?: string;
    }) {
        const { limit = 20, offset = 0, keywords, status, organizationId } = query;

        const where: any = {
            is_deleted: false,
        };

        if (status) {
            where.status = status;
        }

        if (keywords) {
            where.OR = [
                { payment_code: { contains: keywords, mode: 'insensitive' } },
                { rental_contract: { code: { contains: keywords, mode: 'insensitive' } } },
            ];
        }

        if (organizationId) {
            where.rental_contract = {
                ...where.rental_contract,
                organization_id: organizationId,
            };
        }

        const [items, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: {
                    rental_contract: {
                        select: {
                            id: true,
                            code: true,
                            status: true,
                            organization_id: true,
                            organization: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.payment.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    /**
     * Admin manually accept payment (giống như webhook thành công)
     * Thực hiện toàn bộ logic như khi payment thực tế được hoàn thành
     */
    async manualAcceptPayment(paymentId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                rental_contract: true,
                organization: true,
            },
        });

        if (!payment) {
            throw new BadRequestException('Payment not found');
        }

        if (payment.status !== PaymentStatus.PENDING) {
            throw new BadRequestException(`Payment is not PENDING. Current status: ${payment.status}`);
        }

        // Cập nhật payment status = PAID với admin action
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.PAID,
                paid_at: new Date(),
                // Note: sepay_transaction_id để null vì đây là manual action
            },
        });

        // Xử lý theo loại payment (giống logic trong handlePaymentWebhook)
        if (payment.type === PaymentType.ACCOUNT_DEPOSIT) {
            // Nạp tiền vào tài khoản tổ chức
            const organizationId = payment.organization_id;
            if (organizationId) {
                await this.organizationBalanceService.processDepositSuccess(
                    organizationId,
                    payment.amount,
                    payment.id,
                    payment.payment_code,
                    adminUserId, // Admin is performing the action
                );
            }
        } else if (payment.type === PaymentType.NEW_CONTRACT && payment.rental_contract_id) {
            // Cập nhật rental contract status = ACTIVE
            await this.prisma.rentalContract.update({
                where: { id: payment.rental_contract_id },
                data: { status: 'ACTIVE' },
            });

            // Hủy các contracts PENDING xung đột
            await this.rentalContractService.cancelConflictingContracts(payment.rental_contract_id);

            // Emit socket contract:activated
            const contract = await this.prisma.rentalContract.findUnique({
                where: { id: payment.rental_contract_id },
            });
            if (contract) {
                this.websocketGateway.server.to(`user:${payment.created_by}`).emit('contract:activated', {
                    contractId: contract.id,
                    code: contract.code,
                    manuallyAccepted: true,
                    acceptedByAdmin: adminUserId,
                });
            }
        }

        // Emit socket payment:paid
        this.websocketGateway.server.to(`user:${payment.created_by}`).emit('payment:paid', {
            paymentId: payment.id,
            contractId: payment.rental_contract_id,
            paidAt: new Date(),
            manuallyAccepted: true,
            acceptedByAdmin: adminUserId,
        });

        this.systemLogService.info('payment', 'manual-accept',
            `Payment manually accepted by admin: ${payment.payment_code}`,
            { userId: adminUserId, metaData: { paymentId: payment.id, paymentCode: payment.payment_code } });

        // Tự động thêm user vào whitelist sau khi thanh toán thành công
        if (payment.created_by) {
            try {
                const user = await this.prisma.user.findUnique({
                    where: { id: payment.created_by },
                    select: { email: true }
                });

                if (user?.email) {
                    await this.contactListService.addToWhitelist(
                        user.email,
                        `Auto whitelist after manually accepted payment: ${payment.payment_code}`,
                        'SYSTEM_PAYMENT'
                    );
                }
            } catch (error) {
                this.systemLogService.error('payment', 'auto_whitelist',
                    `Failed to auto whitelist user ${payment.created_by}: ${error.message}`,
                    { metaData: { paymentId: payment.id } });
            }
        }

        return { success: true, message: 'Payment manually accepted successfully' };
    }

    /**
     * Admin manually reject payment (giống như hủy payment)
     * Thực hiện toàn bộ logic như khi payment bị từ chối/hủy
     */
    async manualRejectPayment(paymentId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                rental_contract: true,
            },
        });

        if (!payment) {
            throw new BadRequestException('Payment not found');
        }

        if (payment.status !== PaymentStatus.PENDING) {
            throw new BadRequestException(`Payment is not PENDING. Current status: ${payment.status}`);
        }

        // Cập nhật payment status = CANCELLED
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.CANCELLED,
            },
        });

        // Nếu là payment cho rental contract, hủy contract
        if (payment.rental_contract_id) {
            const contract = await this.prisma.rentalContract.findUnique({
                where: { id: payment.rental_contract_id },
            });

            if (contract && contract.status === 'PENDING') {
                // Hủy contract (chỉ hủy nếu còn PENDING)
                await this.prisma.rentalContract.update({
                    where: { id: payment.rental_contract_id },
                    data: {
                        status: 'CANCELLED',
                        cancel_reason: 'Payment manually rejected by admin',
                        cancel_type: 'PROVIDER_REQUEST',
                    },
                });

                // Emit socket contract:cancelled
                this.websocketGateway.server.to(`user:${payment.created_by}`).emit('contract:cancelled', {
                    contractId: contract.id,
                    code: contract.code,
                    reason: 'payment_rejected_by_admin',
                    rejectedByAdmin: adminUserId,
                });
            }
        }

        // Emit socket payment:cancelled
        this.websocketGateway.server.to(`user:${payment.created_by}`).emit('payment:cancelled', {
            paymentId: payment.id,
            contractId: payment.rental_contract_id,
            cancelledAt: new Date(),
            manuallyRejected: true,
            rejectedByAdmin: adminUserId,
        });

        this.systemLogService.info('payment', 'manual-reject',
            `Payment manually rejected by admin: ${payment.payment_code}`,
            { userId: adminUserId, metaData: { paymentId: payment.id, paymentCode: payment.payment_code } });

        return { success: true, message: 'Payment manually rejected successfully' };
    }
}
