import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';

/**
 * Seeder cho dữ liệu tổ chức mẫu
 *
 * Tạo 1 tổ chức mẫu với:
 * - Owner: admin (từ AdminSeeder)
 * - 1 thành viên phụ có quyền organization.update_request.create ở cấp tổ chức
 *
 * Kích hoạt bằng ENV: SEED_ORGANIZATION=true
 */
export class OrganizationSeeder extends BaseSeeder {
  private adminId: string | null = null;

  constructor(prisma: PrismaClient) {
    super(prisma, 'OrganizationSeeder');
  }

  setAdminId(adminId: string) {
    this.adminId = adminId;
  }

  async run(): Promise<void> {
    if (process.env.SEED_ORGANIZATION !== 'true') return;

    try {
      // Kiểm tra đã có tổ chức mẫu chưa
      const existingOrg = await this.prisma.organization.findFirst({
        where: { tax_code: '0123456789', is_deleted: false },
      });

      if (existingOrg) {
        this.logger.log(
          '⚠️ Organization seed data already exists, skipping...',
        );
        return;
      }

      if (!this.adminId) {
        this.logger.warn('⚠️ Admin ID not set, skipping organization seeder');
        return;
      }

      // ─────────────────────────────────────────────
      // 1. Tạo tổ chức mẫu
      // ─────────────────────────────────────────────
      const org = await this.prisma.organization.create({
        data: {
          name: 'Công ty TNHH GEN-HUB Demo',
          international_name: 'GEN-HUB Demo Co., Ltd.',
          tax_code: '0123456789',
          headquarters_address: '123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
          representative_name: 'Administrator',
          representative_title: 'Giám đốc',
          representative_phone: '0901234567',
          representative_email:
            process.env.SEED_ADMIN_EMAIL || 'administrator@gen-hub.dev',
          owner_id: this.adminId,
          is_active: true,
          is_deleted: false,
        },
      });

      this.logger.log(`✅ Demo organization created: ${org.id}`);

      // ─────────────────────────────────────────────
      // 2. Thêm admin vào tổ chức với role owner (member record)
      // ─────────────────────────────────────────────
      const ownerMember = await this.prisma.organizationMember.create({
        data: {
          organization_id: org.id,
          user_id: this.adminId,
          display_name: 'Administrator',
          is_active: true,
          is_accepted: true,
          is_deleted: false,
        },
      });

      this.logger.log(`✅ Owner member record created: ${ownerMember.id}`);

      // ─────────────────────────────────────────────
      // 3. Tạo user thành viên mẫu (có quyền update_request.create)
      // ─────────────────────────────────────────────
      const memberEmail =
        process.env.SEED_ORG_MEMBER_EMAIL || 'org-member@gen-hub.dev';
      const memberPassword =
        process.env.SEED_ORG_MEMBER_PASSWORD || 'Member@123';

      let memberUser = await this.prisma.user.findFirst({
        where: { email: memberEmail },
      });

      if (!memberUser) {
        const hashedPassword = await argon2.hash(memberPassword, {
          memoryCost: 4096,
          timeCost: 3,
          outputLen: 32,
          parallelism: 1,
        });

        memberUser = await this.prisma.user.create({
          data: {
            name: 'Org Member Demo',
            email: memberEmail,
            password: hashedPassword,
            email_confirmed: true,
            is_verified: true,
            is_banned: false,
            language: 'vi',
          },
        });

        this.logger.log(
          `✅ Demo member user created: ${memberEmail} / ${memberPassword}`,
        );
      }

      // Gán role "User" cho thành viên nếu chưa có
      const userRole = await this.prisma.role.findFirst({
        where: { name: 'User', is_deleted: false },
      });

      if (userRole) {
        const existingUserRole = await this.prisma.userRole.findFirst({
          where: { user_id: memberUser.id, role_id: userRole.id },
        });
        if (!existingUserRole) {
          await this.prisma.userRole.create({
            data: {
              user_id: memberUser.id,
              role_id: userRole.id,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Tạo member record cho user trong tổ chức
      const memberRecord = await this.prisma.organizationMember.create({
        data: {
          organization_id: org.id,
          user_id: memberUser.id,
          display_name: 'Org Member Demo',
          is_active: true,
          is_accepted: true,
          is_deleted: false,
        },
      });

      this.logger.log(`✅ Demo member record created: ${memberRecord.id}`);

      // ─────────────────────────────────────────────
      // 4. Gán quyền organization.update_request.create (org-level) cho member
      // ─────────────────────────────────────────────
      const updateRequestPerm =
        await this.prisma.organizationPermission.findFirst({
          where: {
            key: 'organization.update_request.create',
            is_deleted: false,
          },
        });

      if (updateRequestPerm) {
        const existingMemberPerm =
          await this.prisma.organizationMemberPermission.findFirst({
            where: {
              member: { id: memberRecord.id },
              permission: { id: updateRequestPerm.id },
            },
          });

        if (!existingMemberPerm) {
          await this.prisma.organizationMemberPermission.create({
            data: {
              member: { connect: { id: memberRecord.id } },
              permission: { connect: { id: updateRequestPerm.id } },
              is_active: true,
              is_deleted: false,
            },
          });
          this.logger.log(
            '✅ organization.update_request.create permission assigned to demo member',
          );
        }
      } else {
        this.logger.warn(
          '⚠️ organization.update_request.create permission not found. Run OrganizationPermissionsSeeder first.',
        );
      }

      this.logger.log(`
✅ Organization seed data completed:
   - Org: ${org.name} (${org.id})
   - Owner: ${process.env.SEED_ADMIN_EMAIL || 'administrator@gen-hub.dev'}
   - Member with update_request.create: ${memberEmail} / ${memberPassword}
`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed organization data: ${errorMessage}`);
    }
  }
}
