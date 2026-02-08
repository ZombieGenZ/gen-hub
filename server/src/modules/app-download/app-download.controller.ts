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
import type { Response } from 'express';
import { existsSync } from 'fs';
import { CombinedAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, Public, CurrentActor, ApiAuthResponses } from '../../common/decorators';

@ApiTags('App Download')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication (alternative to JWT)', required: false })
@Controller('app-download')
@UseGuards(CombinedAuthGuard, PermissionGuard)
export class AppDownloadController {
    constructor(private readonly service: AppDownloadService) { }

    @Get('shares')
    @RequirePermission('app-download.list')
    @ApiOperation({ summary: 'Get all shares' })
    @ApiAuthResponses()
    @ApiResponse({ status: 200, type: [AppDownloadShareResponseDto] })
    async getAllShares() {
        return this.service.getAllShares();
    }

    @Get('shares/:id')
    @RequirePermission('app-download.read')
    @ApiOperation({ summary: 'Get share by ID' })
    @ApiAuthResponses()
    @ApiResponse({ status: 200, type: AppDownloadShareResponseDto })
    async getShareById(@Param('id') id: string) {
        return this.service.getShareById(id);
    }

    @Post('shares/invite')
    @RequirePermission('app-download.invite')
    @ApiOperation({ summary: 'Create invite and send email' })
    @ApiAuthResponses()
    @ApiResponse({ status: 201, type: AppDownloadShareResponseDto })
    async createInvite(@Body() dto: CreateShareInviteDto, @CurrentActor() actorId: string) {
        return this.service.createShareInvite(dto, actorId);
    }

    @Post('invites/:id/resend')
    @RequirePermission('app-download.invite')
    @ApiOperation({ summary: 'Resend invite email' })
    @ApiAuthResponses()
    @ApiResponse({ status: 200 })
    async resendInvite(@Param('id') id: string) {
        return this.service.resendInvite(id);
    }

    @Delete('invites/:id')
    @RequirePermission('app-download.delete')
    @ApiOperation({ summary: 'Delete invite' })
    @ApiAuthResponses()
    @ApiResponse({ status: 200 })
    async deleteInvite(@Param('id') id: string, @CurrentActor() actorId: string) {
        return this.service.deleteInvite(id, actorId);
    }

    @Get('download/:token')
    @Public()
    @ApiOperation({ summary: 'Download app with token (public endpoint)' })
    @ApiResponse({ status: 200, description: 'File download started' })
    @ApiResponse({ status: 404, description: 'Token invalid or file not found' })
    async downloadApp(@Param('token') token: string, @Res() res: Response) {
        const share = await this.service.validateDownloadToken(token);

        // Track download start
        await this.service.trackDownload(share.id);

        // Serve file
        // Assumes file is served from a configured path
        // For now, I'll use a hardcoded path relative to project root or configured via env
        // User mentioned: "LƯU Ý NÓ SẼ KHÔNG ĐỂ LẠI FILE đó trên repo hiện tại và ở server sẽ có 1 API để tải xuống"
        // This implies the server (NestJS) must have access to the file.
        // Maybe an env variable APP_RELEASE_PATH

        const filePath = process.env.APP_RELEASE_PATH || 'uploads/GenHubApp.exe'; // Default/Fallback

        if (!existsSync(filePath)) {
            return res.status(HttpStatus.NOT_FOUND).send('Installer file not found on server.');
        }

        // Set headers
        res.download(filePath, 'GenHubApp.exe');
    }
}
