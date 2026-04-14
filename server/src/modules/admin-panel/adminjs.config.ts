import AdminJS from 'adminjs';
import { Database, Resource } from '@adminjs/prisma';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Register Prisma adapter for AdminJS
AdminJS.registerAdapter({ Database, Resource });

// Lazy initialize PrismaClient for AdminJS
let adminPrismaClient: PrismaClient | null = null;

const getPrismaClient = (): PrismaClient => {
  if (!adminPrismaClient) {
    const isRds = process.env.DATABASE_URL?.includes('amazonaws.com');
    
    adminPrismaClient = new PrismaClient({
      log: isRds ? [] : ['warn', 'error'],
    } as any);
  }
  return adminPrismaClient;
};

const checkAdminPermission = async (userId: string, prismaClient: PrismaClient): Promise<boolean> => {
  // Check direct permissions
  const directPermissions = await prismaClient.userPermission.findMany({
    where: {
      user_id: userId,
      is_active: true,
      is_deleted: false,
      permission: {
        is_active: true,
        is_deleted: false,
        key: 'server.admin',
      },
    },
  });

  if (directPermissions.length > 0) {
    return true;
  }

  // Check role permissions
  const rolePermissions = await prismaClient.userRole.findMany({
    where: {
      user_id: userId,
      is_active: true,
      is_deleted: false,
      role: {
        is_active: true,
        is_deleted: false,
      },
    },
    include: {
      role: {
        include: {
          permissions: {
            where: {
              is_active: true,
              is_deleted: false,
              permission: {
                is_active: true,
                is_deleted: false,
                key: 'server.admin',
              },
            },
          },
        },
      },
    },
  });

  return rolePermissions.some((ur) => ur.role.permissions.length > 0);
};

export const createAdminJS = async (cookieSecret: string) => {
  const prismaClient = getPrismaClient();
  
  const admin = new AdminJS({
    resources: [
      {
        resource: { model: prismaClient.user, client: prismaClient },
        options: {
          name: 'Người dùng',
          navigation: { name: 'Quản lý hệ thống' },
          properties: {
            id: { isTitle: true },
            name: { isVisible: true },
            email: { isVisible: true },
            phone: { isVisible: true },
            is_verified: { isVisible: { list: true, edit: true, filter: true, show: true } },
            is_banned: { isVisible: { list: true, edit: true, filter: true, show: true } },
            is_online: { isVisible: { list: true, edit: false, filter: true, show: true } },
            last_online: { isVisible: { list: false, edit: false, filter: false, show: true } },
            total_deposited: { isVisible: { list: true, edit: false, filter: false, show: true } },
            loyalty_points: { isVisible: { list: true, edit: true, filter: false, show: true } },
            password: { isVisible: { list: false, edit: true, filter: false, show: false }, type: 'password' },
            created_at: { isVisible: { list: true, edit: false, filter: true, show: true } },
            updated_at: { isVisible: { list: false, edit: false, filter: false, show: true } },
            is_deleted: { isVisible: { list: true, edit: true, filter: true, show: true } },
            deleted_at: { isVisible: { list: false, edit: false, filter: false, show: true } },
          },
          sort: {
            sortBy: 'created_at',
            direction: 'desc',
          },
          filterProperties: ['name', 'email', 'phone', 'is_verified', 'is_banned', 'is_online', 'created_at'],
          listProperties: ['id', 'name', 'email', 'phone', 'is_verified', 'is_banned', 'is_online', 'total_deposited', 'created_at'],
          showProperties: ['id', 'name', 'email', 'phone', 'is_verified', 'is_banned', 'is_online', 'total_deposited', 'loyalty_points', 'created_at', 'updated_at'],
          editProperties: ['name', 'email', 'phone', 'is_verified', 'is_banned', 'loyalty_points', 'password', 'is_deleted'],
        },
      },
      {
        resource: { model: prismaClient.role, client: prismaClient },
        options: {
          name: 'Vai trò',
          navigation: { name: 'Phân quyền' },
          properties: {
            name: { isTitle: true },
            description: { isVisible: true },
            is_active: { isVisible: { list: true, edit: true, filter: true, show: true } },
            is_default: { isVisible: { list: true, edit: true, filter: false, show: true } },
            is_deleted: { isVisible: { list: true, edit: true, filter: true, show: true } },
            created_at: { isVisible: { list: true, edit: false, filter: true, show: true } },
            updated_at: { isVisible: { list: false, edit: false, filter: false, show: true } },
          },
        },
      },
      {
        resource: { model: prismaClient.permission, client: prismaClient },
        options: {
          name: 'Quyền hạn',
          navigation: { name: 'Phân quyền' },
          properties: {
            name: { isTitle: true },
            key: { isVisible: { list: true, edit: true, filter: true, show: true } },
            description: { isVisible: true },
            is_active: { isVisible: { list: true, edit: true, filter: true, show: true } },
            is_deleted: { isVisible: { list: true, edit: true, filter: true, show: true } },
            created_at: { isVisible: { list: true, edit: false, filter: true, show: true } },
          },
        },
      },
      {
        resource: { model: prismaClient.userRole, client: prismaClient },
        options: {
          name: 'Vai trò người dùng',
          navigation: { name: 'Phân quyền' },
          properties: {
            user_id: { isVisible: { list: true, edit: true, filter: true, show: true } },
            role_id: { isVisible: { list: true, edit: true, filter: true, show: true } },
            is_active: { isVisible: { list: true, edit: true, filter: true, show: true } },
            created_at: { isVisible: { list: true, edit: false, filter: true, show: true } },
          },
        },
      },
      {
        resource: { model: prismaClient.userPermission, client: prismaClient },
        options: {
          name: 'Quyền hạn người dùng',
          navigation: { name: 'Phân quyền' },
          properties: {
            user_id: { isVisible: { list: true, edit: true, filter: true, show: true } },
            permission_id: { isVisible: { list: true, edit: true, filter: true, show: true } },
            is_active: { isVisible: { list: true, edit: true, filter: true, show: true } },
            created_at: { isVisible: { list: true, edit: false, filter: true, show: true } },
          },
        },
      },
      {
        resource: { model: prismaClient.organization, client: prismaClient },
        options: {
          name: 'Tổ chức',
          navigation: { name: 'Quản lý hệ thống' },
          properties: {
            name: { isTitle: true },
            tax_code: { isVisible: { list: true, edit: true, filter: true, show: true } },
            email: { isVisible: true },
            phone: { isVisible: true },
            is_active: { isVisible: { list: true, edit: true, filter: true, show: true } },
            is_verified: { isVisible: { list: true, edit: true, filter: true, show: true } },
            created_at: { isVisible: { list: true, edit: false, filter: true, show: true } },
          },
        },
      },
      {
        resource: { model: prismaClient.systemLog, client: prismaClient },
        options: {
          name: 'Nhật ký hệ thống',
          navigation: { name: 'Nhật ký' },
          properties: {
            id: { isTitle: true },
            level: { isVisible: { list: true, edit: false, filter: true, show: true } },
            message: { isVisible: { list: true, edit: false, filter: false, show: true } },
            created_at: { isVisible: { list: true, edit: false, filter: true, show: true } },
          },
          actions: {
            new: { isVisible: false },
            edit: { isVisible: false },
            delete: { isVisible: false },
            bulkDelete: { isVisible: false },
          },
        },
      },
      {
        resource: { model: prismaClient.databaseLog, client: prismaClient },
        options: {
          name: 'Nhật ký database',
          navigation: { name: 'Nhật ký' },
          properties: {
            id: { isTitle: true },
            action: { isVisible: { list: true, edit: false, filter: true, show: true } },
            table_name: { isVisible: { list: true, edit: false, filter: true, show: true } },
            created_at: { isVisible: { list: true, edit: false, filter: true, show: true } },
          },
          actions: {
            new: { isVisible: false },
            edit: { isVisible: false },
            delete: { isVisible: false },
            bulkDelete: { isVisible: false },
          },
        },
      },
    ],
    rootPath: '/admin',
    branding: {
      companyName: 'GEN-HUB Admin',
      logo: false,
      theme: {
        colors: {
          primary100: '#14B8A6',
          primary80: '#14B8A6',
          primary60: '#0F766E',
          primary40: '#0D5A52',
          primary20: '#0A4A43',
          grey100: '#F1F5F9',
          grey80: '#CBD5E1',
          grey60: '#64748B',
          grey40: '#334155',
          grey20: '#1E293B',
          grey10: '#0F172A',
          grey5: '#1a2332',
          grey3: '#222d3d',
          white: '#FFFFFF',
          black: '#1E293B',
          success: '#10B981',
          info: '#0EA5E9',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
    },
    locale: {
      language: 'vi',
      availableLanguages: ['vi'],
      translations: {
        vi: {
          labels: {
            navigation: 'Điều hướng',
            pages: 'Trang',
            dashboard: 'Bảng điều khiển',
          },
          actions: {
            new: 'Tạo mới',
            edit: 'Chỉnh sửa',
            show: 'Xem chi tiết',
            delete: 'Xóa',
            bulkDelete: 'Xóa hàng loạt',
            list: 'Danh sách',
            save: 'Lưu',
            search: 'Tìm kiếm',
            filter: 'Lọc',
            resetFilter: 'Đặt lại bộ lọc',
            confirmRemovalMany: 'Xác nhận xóa nhiều bản ghi',
            confirmRemovalManyDescription: 'Bạn có chắc chắn muốn xóa các bản ghi đã chọn?',
            logout: 'Đăng xuất',
            login: 'Đăng nhập',
            seeTheDocumentation: 'Xem tài liệu',
          },
          buttons: {
            save: 'Lưu',
            addNewItem: 'Thêm mới',
            login: 'Đăng nhập',
            logout: 'Đăng xuất',
            confirmRemovalMany: 'Xác nhận xóa',
            cancel: 'Hủy',
            filter: 'Lọc',
            applyChanges: 'Áp dụng thay đổi',
            resetFilter: 'Đặt lại',
            confirmRemovalManySuffix: '{{ recordsSelected }} bản ghi đã chọn',
            createFirstRecord: 'Tạo bản ghi đầu tiên',
            contactUs: 'Liên hệ',
          },
          components: {
            Login: {
              welcomeHeader: 'Chào mừng đến với GEN-HUB Admin',
              welcomeMessage: 'Vui lòng đăng nhập để tiếp tục',
              properties: {
                email: 'Email',
                password: 'Mật khẩu',
              },
              loginButton: 'Đăng nhập',
            },
          },
          messages: {
            successfullyCreated: 'Tạo bản ghi thành công',
            successfullyUpdated: 'Cập nhật bản ghi thành công',
            successfullyDeleted: 'Xóa bản ghi thành công',
            successfullyBulkDeleted: 'Xóa hàng loạt thành công',
            thereWereValidationErrors: 'Có lỗi xác thực',
            forbiddenError: 'Bạn không có quyền thực hiện hành động này',
            anyForbiddenError: 'Bạn không có quyền truy cập',
            recordNotFound: 'Không tìm thấy bản ghi',
            noRecordsSelected: 'Chưa chọn bản ghi nào',
            theseRecordsWillBeRemoved: 'Các bản ghi sau sẽ bị xóa',
            theseRecordsWillBeRemovedMany: '{{ recordsSelected }} bản ghi sẽ bị xóa',
            pickSomeFirstToRemove: 'Chọn các bản ghi cần xóa',
            error404Resource: 'Không tìm thấy tài nguyên',
            error404Action: 'Không tìm thấy hành động',
            moveUp: 'Di chuyển lên',
            moveDown: 'Di chuyển xuống',
            welcome: 'Chào mừng',
            seeDocs: 'Xem tài liệu',
            goBack: 'Quay lại',
            areYouSure: 'Bạn có chắc chắn?',
            visit: 'Truy cập',
            removeRecord: 'Xóa bản ghi',
            removeRecordDescription: 'Điều này sẽ xóa vĩnh viễn bản ghi',
            couldNotFetchResource: 'Không thể lấy tài nguyên',
            somethingWentWrong: 'Đã xảy ra lỗi',
            quickSearch: 'Tìm kiếm nhanh...',
            previous: 'Trước',
            next: 'Tiếp',
            currentPage: 'Trang hiện tại',
            recordsPerPage: 'Bản ghi mỗi trang',
            allRecords: 'Tất cả bản ghi',
            of: 'trên',
            filterLabel: 'Lọc',
            emptyRecord: 'Không có bản ghi nào',
            noRecords: 'Không có bản ghi',
            search: 'Tìm kiếm...',
            selectedRecords: '{{ selected }} đã chọn',
            confirmDelete: 'Xác nhận xóa',
            confirmDeleteDescription: 'Bạn có chắc chắn muốn xóa bản ghi này? Hành động này không thể hoàn tác.',
            systemHealth: 'Trạng thái hệ thống',
            systemHealthDescription: 'Kiểm tra tình trạng hệ thống',
            ok: 'OK',
          },
          properties: {
            name: 'Tên',
            email: 'Email',
            phone: 'Số điện thoại',
            password: 'Mật khẩu',
            description: 'Mô tả',
            createdAt: 'Ngày tạo',
            updatedAt: 'Ngày cập nhật',
            is_active: 'Hoạt động',
            is_verified: 'Đã xác minh',
            is_banned: 'Đã cấm',
            is_deleted: 'Đã xóa',
            key: 'Khóa',
            role: 'Vai trò',
            permission: 'Quyền hạn',
            user: 'Người dùng',
            organization: 'Tổ chức',
          },
        },
      },
    } as any,
  });

  return {
    admin,
    auth: {
      authenticate: async (email: string, password: string) => {
        try {
          const user = await prismaClient.user.findFirst({
            where: { email, is_deleted: false },
          });

          if (!user || !user.password) {
            return null;
          }

          const validPassword = await bcrypt.compare(password, user.password);
          if (!validPassword) {
            return null;
          }

          // Check if user has server.admin permission
          const hasAdminPermission = await checkAdminPermission(user.id, prismaClient);
          if (!hasAdminPermission) {
            return null;
          }

          return {
            id: user.id,
            email: user.email || user.id,
            name: user.name,
          };
        } catch (error) {
          console.error('AdminJS auth error:', error);
          return null;
        }
      },
      cookieName: 'adminjs-session',
      cookiePassword: cookieSecret,
      cookieMaxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    sessionOptions: {
      resave: true,
      saveUninitialized: true,
      secret: cookieSecret,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    },
  };
};

export type AdminJSInstance = Awaited<ReturnType<typeof createAdminJS>>;
