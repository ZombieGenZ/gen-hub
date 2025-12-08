import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { Client } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger(PrismaService.name);

    async onModuleInit() {
        await this.initializeDatabase();
        await this.$connect();
        await this.seedDefaultRoles();
    }

    /**
     * Parse DATABASE_URL để lấy thông tin kết nối
     */
    private parseDatabaseUrl() {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not defined');
        }

        // Parse URL: postgresql://user:password@host:port/database
        const regex = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
        const match = databaseUrl.match(regex);

        if (!match) {
            throw new Error('Invalid DATABASE_URL format');
        }

        return {
            user: match[1],
            password: match[2],
            host: match[3],
            port: parseInt(match[4], 10),
            database: match[5],
        };
    }

    /**
     * Tạo database và extension uuid-ossp nếu chưa tồn tại
     */
    private async ensureDatabaseAndExtension() {
        const config = this.parseDatabaseUrl();

        // Kết nối tới postgres database mặc định để tạo database
        const adminClient = new Client({
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port,
            database: 'postgres',
        });

        try {
            await adminClient.connect();
            this.logger.log('🔌 Connected to PostgreSQL server');

            // Kiểm tra và tạo database
            const dbCheckResult = await adminClient.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [config.database]
            );

            if (dbCheckResult.rows.length === 0) {
                this.logger.log(`📦 Creating database "${config.database}"...`);
                await adminClient.query(`CREATE DATABASE "${config.database}"`);
                this.logger.log(`✅ Database "${config.database}" created successfully`);
            } else {
                this.logger.log(`✅ Database "${config.database}" already exists`);
            }

            await adminClient.end();

            // Kết nối tới database mới tạo để thêm extension
            const dbClient = new Client({
                user: config.user,
                password: config.password,
                host: config.host,
                port: config.port,
                database: config.database,
            });

            await dbClient.connect();

            // Tạo extension uuid-ossp
            this.logger.log('🔧 Creating uuid-ossp extension...');
            await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
            this.logger.log('✅ uuid-ossp extension is ready');

            await dbClient.end();

            return true;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to setup database: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Xóa và tạo lại database
     */
    private async recreateDatabase() {
        const config = this.parseDatabaseUrl();

        // Đóng kết nối hiện tại
        await this.$disconnect();

        // Kết nối tới postgres database mặc định
        const adminClient = new Client({
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port,
            database: 'postgres',
        });

        try {
            await adminClient.connect();

            // Terminate tất cả connections tới database
            this.logger.log(`🔌 Terminating connections to "${config.database}"...`);
            await adminClient.query(`
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = $1
                AND pid <> pg_backend_pid()
            `, [config.database]);

            // Xóa database
            this.logger.log(`🗑️ Dropping database "${config.database}"...`);
            // await adminClient.query(`DROP DATABASE IF EXISTS "${config.database}"`);

            // Tạo lại database
            this.logger.log(`📦 Creating database "${config.database}"...`);
            await adminClient.query(`CREATE DATABASE "${config.database}"`);

            await adminClient.end();

            // Kết nối tới database mới để thêm extension
            const dbClient = new Client({
                user: config.user,
                password: config.password,
                host: config.host,
                port: config.port,
                database: config.database,
            });

            await dbClient.connect();

            // Tạo extension uuid-ossp
            this.logger.log('🔧 Creating uuid-ossp extension...');
            await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
            this.logger.log('✅ Database recreated with uuid-ossp extension');

            await dbClient.end();

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to recreate database: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Khởi tạo database: kiểm tra kết nối và chạy migration nếu cần
     */
    private async initializeDatabase() {
        let needsSchemaSync = false;

        try {
            // Thử kết nối để kiểm tra database tồn tại
            await this.$connect();
            this.logger.log('✅ Database connection successful');

            // Kiểm tra xem tables đã được tạo chưa
            try {
                await this.$queryRaw`SELECT 1 FROM roles LIMIT 1`;
                this.logger.log('✅ Database schema is ready');
            } catch {
                this.logger.warn('⚠️ Database tables not found, need schema sync');
                needsSchemaSync = true;
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`⚠️ Database connection failed: ${errorMessage}`);

            // Tạo database và extension trước
            await this.ensureDatabaseAndExtension();
            needsSchemaSync = true;
        }

        // Nếu cần sync schema (không có tables hoặc sau tạo database)
        if (needsSchemaSync) {
            this.logger.log('🔧 Running Prisma db push to sync schema...');
            try {
                execSync('npx prisma db push', {
                    cwd: process.cwd(),
                    stdio: 'inherit',
                });
                this.logger.log('✅ Database schema synced successfully');

                // Generate Prisma Client để đảm bảo client đồng bộ với schema
                execSync('npx prisma generate', {
                    cwd: process.cwd(),
                    stdio: 'inherit',
                });
            } catch {
                // Khi db push thất bại, thử xóa và tạo lại database
                this.logger.warn('⚠️ Database push failed, attempting to recreate database...');
                await this.recreateDatabase();

                // Thử lại db push
                this.logger.log('🔧 Retrying Prisma db push...');
                try {
                    execSync('npx prisma db push', {
                        cwd: process.cwd(),
                        stdio: 'inherit',
                    });
                    this.logger.log('✅ Database schema synced successfully');

                    execSync('npx prisma generate', {
                        cwd: process.cwd(),
                        stdio: 'inherit',
                    });
                } catch (retryError: unknown) {
                    const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
                    this.logger.error(`❌ Database push retry failed: ${retryErrorMessage}`);
                    throw new Error('Failed to initialize database schema after retry');
                }
            }
        }
    }

    /**
     * Seed các roles mặc định nếu chưa tồn tại
     */
    private async seedDefaultRoles() {
        try {
            // Kiểm tra xem đã có roles chưa
            const existingRoles = await this.role.count();

            if (existingRoles === 0) {
                this.logger.log('🌱 Seeding default roles...');

                // Tạo 3 roles: User (is_default=true), Admin, Super Admin
                await this.role.createMany({
                    data: [
                        {
                            name: 'User',
                            description: 'Người dùng thông thường',
                            is_default: true,
                            is_active: true,
                            is_deleted: false,
                        },
                        {
                            name: 'Admin',
                            description: 'Quản trị viên hệ thống',
                            is_default: false,
                            is_active: true,
                            is_deleted: false,
                        },
                        {
                            name: 'Super Admin',
                            description: 'Quản trị viên cấp cao với toàn quyền hệ thống',
                            is_default: false,
                            is_active: true,
                            is_deleted: false,
                        },
                    ],
                });

                this.logger.log('✅ Default roles created successfully:');
                this.logger.log('   - User (is_default: true)');
                this.logger.log('   - Admin');
                this.logger.log('   - Super Admin');
            } else {
                this.logger.log(`📋 Found ${existingRoles} existing roles, skipping seed`);
            }

            await this.seedConfigPermissions();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed default roles: ${errorMessage}`);
        }
    }

    /**
     * Seed các permissions cho config và gán vào Super Admin role
     */
    private async seedConfigPermissions() {
        try {
            const configPermissions = [
                { key: 'config.update', name: 'Cập nhật cấu hình', description: 'Quyền cập nhật cấu hình ứng dụng' },
                { key: 'config.reset', name: 'Reset cấu hình', description: 'Quyền reset cấu hình về mặc định' },
                { key: 'config.reload', name: 'Reload cấu hình', description: 'Quyền reload cấu hình từ file' },
            ];

            for (const perm of configPermissions) {
                const existing = await this.permission.findFirst({
                    where: { key: perm.key },
                });

                if (!existing) {
                    await this.permission.create({
                        data: {
                            key: perm.key,
                            name: perm.name,
                            description: perm.description,
                            is_active: true,
                            is_deleted: false,
                        },
                    });
                    this.logger.log(`✅ Created permission: ${perm.key}`);
                }
            }

            const superAdminRole = await this.role.findFirst({
                where: { name: 'Super Admin', is_deleted: false },
            });

            if (superAdminRole) {
                const permissions = await this.permission.findMany({
                    where: {
                        key: { in: configPermissions.map(p => p.key) },
                        is_deleted: false,
                    },
                });

                for (const permission of permissions) {
                    const existingAssignment = await this.rolePermission.findFirst({
                        where: {
                            role_id: superAdminRole.id,
                            permission_id: permission.id,
                        },
                    });

                    if (!existingAssignment) {
                        await this.rolePermission.create({
                            data: {
                                role_id: superAdminRole.id,
                                permission_id: permission.id,
                                is_active: true,
                                is_deleted: false,
                            },
                        });
                        this.logger.log(`✅ Assigned ${permission.key} to Super Admin`);
                    }
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed config permissions: ${errorMessage}`);
        }
    }


    async enableShutdownHooks(app: INestApplication) {
        process.on('beforeExit', async () => {
            await app.close();
        });
    }
}
