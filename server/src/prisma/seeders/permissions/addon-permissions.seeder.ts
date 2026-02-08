import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Addon-related Permissions
 * Bao gồm: addon, addon-type, amenity, insurance, coupon, coupon-schedule
 */
export class AddonPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'AddonPermissionsSeeder');
    }

    async run(): Promise<void> {
        await this.seedAddonPermissions();
        await this.seedAddonTypePermissions();
        await this.seedAmenityPermissions();
        await this.seedInsurancePermissions();
        await this.seedCouponPermissions();
        await this.seedCouponSchedulePermissions();
    }

    private async seedAddonPermissions() {
        try {
            const addonPermissions = [
                { key: 'addon.create', name: 'Tạo addon', description: 'Quyền tạo mới addon' },
                { key: 'addon.list', name: 'Xem danh sách addon (của mình)', description: 'Quyền xem danh sách addon do chính mình tạo' },
                { key: 'addon.list.all', name: 'Xem tất cả addon', description: 'Quyền xem tất cả addon của mọi người' },
                { key: 'addon.read', name: 'Xem chi tiết addon (của mình)', description: 'Quyền xem chi tiết addon do chính mình tạo' },
                { key: 'addon.read.all', name: 'Xem chi tiết tất cả addon', description: 'Quyền xem chi tiết tất cả addon' },
                { key: 'addon.update', name: 'Cập nhật addon (của mình)', description: 'Quyền cập nhật addon do chính mình tạo' },
                { key: 'addon.update.all', name: 'Cập nhật tất cả addon', description: 'Quyền cập nhật tất cả addon' },
                { key: 'addon.delete', name: 'Xóa addon (của mình)', description: 'Quyền xóa addon do chính mình tạo' },
                { key: 'addon.delete.all', name: 'Xóa tất cả addon', description: 'Quyền xóa tất cả addon' },
            ];

            for (const perm of addonPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const roles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: addonPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of roles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Addon permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed addon permissions: ${errorMessage}`);
        }
    }

    private async seedAddonTypePermissions() {
        try {
            const addonTypePermissions = [
                { key: 'addon-type.create', name: 'Tạo loại addon', description: 'Quyền tạo mới loại addon' },
                { key: 'addon-type.list', name: 'Xem danh sách loại addon', description: 'Quyền xem danh sách loại addon' },
                { key: 'addon-type.read', name: 'Xem chi tiết loại addon', description: 'Quyền xem chi tiết loại addon' },
                { key: 'addon-type.update', name: 'Cập nhật loại addon', description: 'Quyền cập nhật loại addon' },
                { key: 'addon-type.delete', name: 'Xóa loại addon', description: 'Quyền xóa loại addon' },
            ];

            for (const perm of addonTypePermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: addonTypePermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ AddonType permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed addon-type permissions: ${errorMessage}`);
        }
    }

    private async seedAmenityPermissions() {
        try {
            const amenityPermissions = [
                { key: 'amenity.create', name: 'Tạo tiện ích', description: 'Quyền tạo mới tiện ích' },
                { key: 'amenity.list', name: 'Xem danh sách tiện ích', description: 'Quyền xem danh sách tiện ích' },
                { key: 'amenity.list.all', name: 'Xem tất cả tiện ích', description: 'Quyền xem tất cả tiện ích kể cả inactive' },
                { key: 'amenity.read', name: 'Xem chi tiết tiện ích', description: 'Quyền xem chi tiết tiện ích' },
                { key: 'amenity.update', name: 'Cập nhật tiện ích', description: 'Quyền cập nhật tiện ích' },
                { key: 'amenity.delete', name: 'Xóa tiện ích', description: 'Quyền xóa tiện ích' },
            ];

            for (const perm of amenityPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: amenityPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Amenity permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed amenity permissions: ${errorMessage}`);
        }
    }

    private async seedInsurancePermissions() {
        try {
            const insurancePermissions = [
                { key: 'insurance.create', name: 'Tạo bảo hiểm', description: 'Quyền tạo mới gói bảo hiểm' },
                { key: 'insurance.list', name: 'Xem danh sách bảo hiểm', description: 'Quyền xem danh sách gói bảo hiểm' },
                { key: 'insurance.list.all', name: 'Xem tất cả bảo hiểm', description: 'Quyền xem tất cả gói bảo hiểm kể cả inactive' },
                { key: 'insurance.read', name: 'Xem chi tiết bảo hiểm', description: 'Quyền xem chi tiết gói bảo hiểm' },
                { key: 'insurance.update', name: 'Cập nhật bảo hiểm', description: 'Quyền cập nhật gói bảo hiểm' },
                { key: 'insurance.delete', name: 'Xóa bảo hiểm', description: 'Quyền xóa gói bảo hiểm' },
            ];

            for (const perm of insurancePermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: insurancePermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Insurance permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed insurance permissions: ${errorMessage}`);
        }
    }

    private async seedCouponPermissions() {
        try {
            const couponPermissions = [
                { key: 'coupon.create', name: 'Tạo coupon', description: 'Quyền tạo mới coupon' },
                { key: 'coupon.list', name: 'Xem danh sách coupon (owned)', description: 'Quyền xem danh sách coupon do chính mình tạo' },
                { key: 'coupon.read', name: 'Xem chi tiết coupon (owned)', description: 'Quyền xem chi tiết coupon do chính mình tạo' },
                { key: 'coupon.update', name: 'Cập nhật coupon (owned)', description: 'Quyền cập nhật coupon do chính mình tạo' },
                { key: 'coupon.delete', name: 'Xóa coupon (owned)', description: 'Quyền xóa coupon do chính mình tạo' },
                { key: 'coupon.list.all', name: 'Xem tất cả coupon', description: 'Quyền xem danh sách tất cả coupon' },
                { key: 'coupon.read.all', name: 'Xem chi tiết tất cả coupon', description: 'Quyền xem chi tiết tất cả coupon' },
                { key: 'coupon.update.all', name: 'Cập nhật tất cả coupon', description: 'Quyền cập nhật tất cả coupon' },
                { key: 'coupon.delete.all', name: 'Xóa tất cả coupon', description: 'Quyền xóa tất cả coupon' },
            ];

            for (const perm of couponPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const roles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: couponPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of roles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Coupon permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed coupon permissions: ${errorMessage}`);
        }
    }

    private async seedCouponSchedulePermissions() {
        try {
            const couponSchedulePermissions = [
                { key: 'coupon-schedule.create', name: 'Tạo lịch coupon', description: 'Quyền tạo lịch tự động tạo coupon' },
                { key: 'coupon-schedule.list', name: 'Xem danh sách lịch coupon (owned)', description: 'Quyền xem danh sách lịch coupon do chính mình tạo' },
                { key: 'coupon-schedule.read', name: 'Xem chi tiết lịch coupon (owned)', description: 'Quyền xem chi tiết lịch coupon do chính mình tạo' },
                { key: 'coupon-schedule.update', name: 'Cập nhật lịch coupon (owned)', description: 'Quyền cập nhật lịch coupon do chính mình tạo' },
                { key: 'coupon-schedule.delete', name: 'Xóa lịch coupon (owned)', description: 'Quyền xóa lịch coupon do chính mình tạo' },
                { key: 'coupon-schedule.list.all', name: 'Xem tất cả lịch coupon', description: 'Quyền xem danh sách tất cả lịch coupon' },
                { key: 'coupon-schedule.read.all', name: 'Xem chi tiết tất cả lịch coupon', description: 'Quyền xem chi tiết tất cả lịch coupon' },
                { key: 'coupon-schedule.update.all', name: 'Cập nhật tất cả lịch coupon', description: 'Quyền cập nhật tất cả lịch coupon' },
                { key: 'coupon-schedule.delete.all', name: 'Xóa tất cả lịch coupon', description: 'Quyền xóa tất cả lịch coupon' },
            ];

            for (const perm of couponSchedulePermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const roles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: couponSchedulePermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of roles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ CouponSchedule permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed coupon-schedule permissions: ${errorMessage}`);
        }
    }
}
