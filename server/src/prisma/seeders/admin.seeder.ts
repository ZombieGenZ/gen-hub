import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';

/**
 * Seeder cho Admin Account
 * Seed tài khoản admin mặc định
 * Thông tin từ ENV: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 * Mặc định: administrator@gen-hub.dev | Admin@123
 */
export class AdminSeeder {
    private readonly logger = new Logger('AdminSeeder');
    private readonly prisma: PrismaClient;
    private adminId: string | null = null;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Get the seeded admin ID
     */
    getAdminId(): string | null {
        return this.adminId;
    }

    /**
     * Run the admin seeder
     */
    async run(): Promise<void> {
        try {
            const email = process.env.SEED_ADMIN_EMAIL || 'administrator@gen-hub.dev';
            const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

            // Kiểm tra xem admin đã tồn tại chưa
            let admin = await this.prisma.user.findFirst({
                where: { email },
            });

            if (!admin) {
                // Hash password
                const hashedPassword = await argon2.hash(password, {
                    memoryCost: 4096,
                    timeCost: 3,
                    outputLen: 32,
                    parallelism: 1,
                });

                // Tạo admin user
                admin = await this.prisma.user.create({
                    data: {
                        name: 'Administrator',
                        email,
                        password: hashedPassword,
                        email_confirmed: true,
                        is_verified: true,
                        is_banned: false,
                        language: 'vi',
                    },
                });

                this.logger.log(`✅ Admin account seeded: ${email}`);
            }

            // Lưu admin ID để dùng cho các seed khác
            this.adminId = admin.id;

            // Gán role Super Admin cho admin
            const superAdminRole = await this.prisma.role.findFirst({
                where: { name: 'Super Admin', is_deleted: false },
            });

            if (superAdminRole) {
                const existingUserRole = await this.prisma.userRole.findFirst({
                    where: { user_id: admin.id, role_id: superAdminRole.id },
                });

                if (!existingUserRole) {
                    await this.prisma.userRole.create({
                        data: {
                            user_id: admin.id,
                            role_id: superAdminRole.id,
                            is_active: true,
                            is_deleted: false,
                        },
                    });
                    this.logger.log('✅ Super Admin role assigned to admin account');
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed admin account: ${errorMessage}`);
        }
    }
}
