import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
    Res,
    HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AppDownloadService } from './app-download.service';
import { CreateShareInviteDto, AppDownloadShareResponseDto } from './dto';
import { GetResponse, CreatedResponse } from '../../common/responses/success.response';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { CombinedAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, Public, CurrentActor, ApiAuthResponses } from '../../common/decorators';
import { I18nLang, I18nService } from 'nestjs-i18n';

@ApiTags('App Download')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication (alternative to JWT)', required: false })
@Controller('app-download')
@UseGuards(CombinedAuthGuard, PermissionGuard)
export class AppDownloadController {
    constructor(
        private readonly service: AppDownloadService,
        private readonly i18n: I18nService
    ) { }

    @Get('shares')
    @RequirePermission('app-download.list')
    @ApiOperation({ summary: 'Get all shares' })
    @ApiAuthResponses()
    @ApiResponse({ status: 200, type: [AppDownloadShareResponseDto] })
    async getAllShares(@I18nLang() lang: string) {
        const shares = await this.service.getAllShares();
        return new GetResponse(
            'app-download.list_shares',
            shares,
            await this.i18n.translate('app-download.success.list_shares', { lang })
        );
    }

    @Get('shares/:id')
    @RequirePermission('app-download.read')
    @ApiOperation({ summary: 'Get share by ID' })
    @ApiAuthResponses()
    @ApiResponse({ status: 200, type: AppDownloadShareResponseDto })
    async getShareById(@Param('id') id: string, @I18nLang() lang: string) {
        const share = await this.service.getShareById(id);
        return new GetResponse(
            'app-download.get_share',
            share,
            await this.i18n.translate('app-download.success.get_share', { lang })
        );
    }

    @Post('shares/invite')
    @RequirePermission('app-download.invite')
    @ApiOperation({ summary: 'Create invite and send email' })
    @ApiAuthResponses()
    @ApiResponse({ status: 201, type: AppDownloadShareResponseDto })
    async createInvite(@Body() dto: CreateShareInviteDto, @CurrentActor() actorId: string, @I18nLang() lang: string) {
        const share = await this.service.createShareInvite(dto, actorId);
        return new CreatedResponse(
            'app-download.create_invite',
            share,
            await this.i18n.translate('app-download.success.share_created', { lang })
        );
    }

    @Post('invites/:id/resend')
    @RequirePermission('app-download.invite')
    @ApiOperation({ summary: 'Resend invite email' })
    @ApiAuthResponses()
    @ApiResponse({ status: 200 })
    async resendInvite(@Param('id') id: string, @I18nLang() lang: string) {
        await this.service.resendInvite(id);
        return new GetResponse(
            'app-download.resend_invite',
            null,
            await this.i18n.translate('app-download.success.invite_sent', { lang })
        );
    }

    @Delete('invites/:id')
    @RequirePermission('app-download.delete')
    @ApiOperation({ summary: 'Delete invite' })
    @ApiAuthResponses()
    @ApiResponse({ status: 200 })
    async deleteInvite(@Param('id') id: string, @CurrentActor() actorId: string, @I18nLang() lang: string) {
        await this.service.deleteInvite(id, actorId);
        return new GetResponse(
            'app-download.delete_invite',
            null,
            await this.i18n.translate('app-download.success.invite_deleted', { lang })
        );
    }

    @Get('download/:token')
    @Public()
    @ApiOperation({ summary: 'Download app with token (public endpoint)' })
    @ApiResponse({ status: 200, description: 'File download started' })
    @ApiResponse({ status: 404, description: 'Token invalid or file not found' })
    async downloadApp(@Param('token') token: string, @Res() res: Response) {
        const share = await this.service.validateDownloadToken(token);

        await this.service.trackDownload(share.id);

        const filePath = process.env.APP_RELEASE_PATH || 'uploads/GenHubApp.exe';

        if (!existsSync(filePath)) {
            return res.status(HttpStatus.NOT_FOUND).send('Installer file not found on server.');
        }

        // Set headers
        res.download(filePath, 'GenHubApp.exe');
    }
}
