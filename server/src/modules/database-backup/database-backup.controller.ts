import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { DatabaseBackupService } from './database-backup.service';
import {
    TriggerBackupDto,
    GetBackupsQueryDto,
    GetDownloadUrlDto,
    BackupIdParamDto,
} from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequireAnyPermission, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import {
    CreatedResponse,
    GetResponse,
    OkResponse,
} from '../../common/responses/success.response';
import { I18nService } from 'nestjs-i18n';

@ApiTags('Database Backup')
@Controller('admin/backups')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class DatabaseBackupController {
    constructor(
        private readonly databaseBackupService: DatabaseBackupService,
        private readonly i18n: I18nService,
    ) { }

    @Post('trigger')
    @HttpCode(HttpStatus.CREATED)
    @RequireAnyPermission('backup.admin', 'backup.trigger')
    @ApiOperation({
        summary: 'Trigger backup thủ công',
        description: 'Kích hoạt backup database thủ công. Yêu cầu API key hợp lệ và quyền `backup.admin` hoặc `backup.trigger`. Backup sẽ được upload lên cloud storage.',
    })
    @ApiBody({
        type: TriggerBackupDto,
        description: 'Thông tin để trigger backup',
        examples: {
            full_backup: {
                summary: 'Full database backup',
                value: { key: 'your-backup-api-key' },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Backup đã được tạo thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'backup.trigger.success' },
                message: { type: 'string', example: 'Đã kích hoạt backup thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
                        filename: { type: 'string', example: 'backup-2026-02-07-103000.sql.gz' },
                        size: { type: 'number', description: 'Dung lượng (bytes)', example: 52428800 },
                        storage_path: { type: 'string', example: 's3://backups/2026/02/07/...' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Key không hợp lệ hoặc backup thất bại' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async triggerBackup(@Body() dto: TriggerBackupDto, @Req() req: Request & { user: { userId: string }; i18nLang: string }) {
        const result = await this.databaseBackupService.triggerBackup(
            dto.key,
            req.user.userId,
            req.i18nLang,
        );

        return new CreatedResponse(
            'backup.trigger.success',
            result,
            this.i18n.t('database-backup.success.triggered', { lang: req.i18nLang }),
        );
    }

    @Get()
    @RequireAnyPermission('backup.admin', 'backup.list')
    @ApiOperation({
        summary: 'Lấy danh sách backups',
        description: 'Lấy danh sách các bản backup đã tạo với phân trang và bộ lọc. Yêu cầu quyền `backup.admin` hoặc `backup.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng tối đa', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiQuery({ name: 'key', required: false, type: String, description: 'Backup API key để xác thực' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách backups',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'backup.list.success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    filename: { type: 'string', example: 'backup-2026-02-07.sql.gz' },
                                    size: { type: 'number', example: 52428800 },
                                    status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'], example: 'COMPLETED' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    created_by: { type: 'string', description: 'User ID đã trigger backup' },
                                },
                            },
                        },
                        total: { type: 'number', example: 30 },
                        limit: { type: 'number', example: 20 },
                        offset: { type: 'number', example: 0 },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Key không hợp lệ' })
    @ApiAuthResponses()
    async listBackups(@Query() query: GetBackupsQueryDto, @Req() req: Request & { i18nLang: string }) {
        const result = await this.databaseBackupService.listBackups(query, req.i18nLang);

        return new GetResponse(
            'backup.list.success',
            result,
            this.i18n.t('database-backup.success.list', { lang: req.i18nLang }),
        );
    }

    @Post(':id/download-url')
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission('backup.admin', 'backup.download')
    @ApiOperation({
        summary: 'Lấy URL tải xuống backup',
        description: 'Tạo URL tạm thời để tải xuống file backup. URL có thời hạn giới hạn. Yêu cầu quyền `backup.admin` hoặc `backup.download`.',
    })
    @ApiParam({ name: 'id', description: 'ID của backup', type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiBody({
        type: GetDownloadUrlDto,
        description: 'Thông tin xác thực',
        examples: {
            get_url: {
                summary: 'Lấy download URL',
                value: { key: 'your-backup-api-key' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'URL tải xuống',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'backup.download.success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        download_url: { type: 'string', description: 'URL tạm thời để tải backup', example: 'https://storage.example.com/...' },
                        expires_at: { type: 'string', format: 'date-time', description: 'Thời gian hết hạn URL' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Key không hợp lệ' })
    @ApiResponse({ status: 404, description: 'Backup không tồn tại' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async getDownloadUrl(
        @Param() param: BackupIdParamDto,
        @Body() dto: GetDownloadUrlDto,
        @Req() req: Request & { i18nLang: string },
    ) {
        const result = await this.databaseBackupService.getDownloadUrl(
            param.id,
            dto.key,
            req.i18nLang,
        );

        return new OkResponse(
            'backup.download.success',
            result,
            this.i18n.t('database-backup.success.download_url', { lang: req.i18nLang }),
        );
    }
}
