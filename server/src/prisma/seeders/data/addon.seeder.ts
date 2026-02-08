import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho dữ liệu Addon (Addon Types và Addons)
 */
export class AddonSeeder extends BaseSeeder {
    private adminId: string | null = null;

    constructor(prisma: PrismaClient) {
        super(prisma, 'AddonSeeder');
    }

    setAdminId(adminId: string) {
        this.adminId = adminId;
    }

    async run(): Promise<void> {
        await this.seedAddonTypes();
        await this.seedAddons();
    }

    private async seedAddonTypes() {
        if (process.env.SEED_ADDON_TYPES !== 'true') return;

        try {
            const existingCount = await this.prisma.addonType.count({
                where: { is_deleted: false },
            });

            if (existingCount > 0) return;

            const addonTypes = [
                { name: 'Dịch vụ vận hành', description: 'Các dịch vụ liên quan đến vận hành kho' },
                { name: 'Bảo mật & An ninh', description: 'Các dịch vụ nâng cao bảo mật' },
                { name: 'Tiện ích bổ sung', description: 'Các tiện ích bổ sung cho kho hàng' },
            ];

            await this.prisma.addonType.createMany({
                data: addonTypes.map((t) => ({
                    ...t,
                    created_by: this.adminId,
                    is_active: true,
                    is_deleted: false,
                })),
            });

            this.logger.log('✅ Addon types seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed addon types: ${errorMessage}`);
        }
    }

    private async seedAddons() {
        if (process.env.SEED_ADDONS !== 'true') return;

        try {
            const existingCount = await this.prisma.addon.count({
                where: { is_deleted: false },
            });

            if (existingCount > 0) return;

            const operationType = await this.prisma.addonType.findFirst({
                where: { name: 'Dịch vụ vận hành', is_deleted: false },
            });
            const securityType = await this.prisma.addonType.findFirst({
                where: { name: 'Bảo mật & An ninh', is_deleted: false },
            });
            const utilityType = await this.prisma.addonType.findFirst({
                where: { name: 'Tiện ích bổ sung', is_deleted: false },
            });

            if (!operationType || !securityType || !utilityType) {
                this.logger.warn('⚠️ Addon types not found, skipping addon seeding');
                return;
            }

            const addons = [
                { name: 'Dịch vụ bốc xếp hàng hóa', description: 'Nhân công bốc xếp hàng hóa', price: 500000, price_unit: 'VND', addon_type_id: operationType.id },
                { name: 'Xe nâng hàng (Forklift)', description: 'Thuê xe nâng hàng theo giờ', price: 300000, price_unit: 'VND', addon_type_id: operationType.id },
                { name: 'Quản lý hàng tồn kho', description: 'Phần mềm quản lý hàng tồn kho', price: 1000000, price_unit: 'VND', addon_type_id: operationType.id },
                { name: 'Camera giám sát riêng', description: 'Lắp đặt camera riêng cho kho', price: 500000, price_unit: 'VND', addon_type_id: securityType.id },
                { name: 'Kiểm soát ra vào', description: 'Hệ thống kiểm soát ra vào bằng thẻ', price: 300000, price_unit: 'VND', addon_type_id: securityType.id },
                { name: 'Wifi tốc độ cao', description: 'Cung cấp wifi tốc độ cao', price: 200000, price_unit: 'VND', addon_type_id: utilityType.id },
                { name: 'Phòng họp', description: 'Thuê phòng họp theo giờ', price: 150000, price_unit: 'VND', addon_type_id: utilityType.id },
            ];

            for (const addon of addons) {
                await this.prisma.addon.create({
                    data: {
                        ...addon,
                        created_by: this.adminId,
                        is_active: true,
                        is_deleted: false,
                    },
                });
            }

            this.logger.log('✅ Addons seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed addons: ${errorMessage}`);
        }
    }
}
