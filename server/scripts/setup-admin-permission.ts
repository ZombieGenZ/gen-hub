import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script tạo permission server.admin và gán cho admin user
 * 
 * Cách dùng:
 * 1. Đặt ADMIN_EMAIL trong .env hoặc sửa biến adminEmail bên dưới
 * 2. Chạy: npx ts-node scripts/setup-admin-permission.ts
 */
async function setupAdminPermission() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gen-hub.dev';

  try {
    // 1. Tạo permission server.admin
    let permission = await prisma.permission.findFirst({
      where: { key: 'server.admin', is_deleted: false },
    });

    if (!permission) {
      permission = await prisma.permission.create({
        data: {
          name: 'Quản trị hệ thống',
          key: 'server.admin',
          description: 'Quyền truy cập vào trang quản trị admin',
          is_active: true,
        },
      });
      console.log('✅ Permission created:', permission.key, `(${permission.id})`);
    } else {
      console.log('ℹ️ Permission already exists:', permission.key, `(${permission.id})`);
    }

    // 2. Tạo role Admin
    let role = await prisma.role.findFirst({
      where: { name: 'System Administrator', is_deleted: false },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: 'System Administrator',
          description: 'Quản trị viên hệ thống',
          is_active: true,
          is_default: false,
        },
      });
      console.log('✅ Role created:', role.name, `(${role.id})`);
    } else {
      console.log('ℹ️ Role already exists:', role.name, `(${role.id})`);
    }

    // 3. Gán permission cho role
    const existingRolePermission = await prisma.rolePermission.findFirst({
      where: {
        role_id: role.id,
        permission_id: permission.id,
        is_deleted: false,
      },
    });

    if (!existingRolePermission) {
      await prisma.rolePermission.create({
        data: {
          role_id: role.id,
          permission_id: permission.id,
          is_active: true,
        },
      });
      console.log('✅ Permission assigned to role');
    } else {
      console.log('ℹ️ Permission already assigned to role');
    }

    // 4. Gán role cho admin user
    const user = await prisma.user.findFirst({
      where: { email: adminEmail, is_deleted: false },
    });

    if (user) {
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          user_id: user.id,
          role_id: role.id,
          is_deleted: false,
        },
      });

      if (!existingUserRole) {
        await prisma.userRole.create({
          data: {
            user_id: user.id,
            role_id: role.id,
            is_active: true,
          },
        });
        console.log('✅ Role assigned to admin user:', user.email);
      } else {
        console.log('ℹ️ User already has this role');
      }
    } else {
      console.log('⚠️  Admin user not found with email:', adminEmail);
      console.log('   Please create the user first or update ADMIN_EMAIL in .env');
    }

    console.log('\n🎉 Admin panel setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Set ADMIN_PANEL_ENABLED=true in .env');
    console.log('   2. Set ADMIN_COOKIE_SECRET=<secure-random-string> in .env');
    console.log('   3. Restart the server');
    console.log('   4. Access http://localhost:4000/admin and login');
  } catch (error) {
    console.error('❌ Error setting up admin permission:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdminPermission();
