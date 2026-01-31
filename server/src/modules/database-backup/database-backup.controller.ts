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
} from '@nestjs/swagger';
import { DatabaseBackupService } from './database-backup.service';
import {
    TriggerBackupDto,
    GetBackupsQueryDto,
    GetDownloadUrlDto,
    BackupIdParamDto,
} from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequireAnyPermission } from '../../common/decorators';
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
    @ApiOperation({ summary: 'Trigger backup thủ công' })
    @ApiResponse({ status: 201, description: 'Backup đã được tạo thành công' })
    @ApiResponse({ status: 400, description: 'Key không hợp lệ hoặc backup thất bại' })
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
    @ApiOperation({ summary: 'Lấy danh sách backups' })
    @ApiResponse({ status: 200, description: 'Danh sách backups' })
    @ApiResponse({ status: 400, description: 'Key không hợp lệ' })
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
    @ApiOperation({ summary: 'Lấy URL tải xuống backup' })
    @ApiResponse({ status: 200, description: 'URL tải xuống' })
    @ApiResponse({ status: 400, description: 'Key không hợp lệ' })
    @ApiResponse({ status: 404, description: 'Backup không tồn tại' })
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
