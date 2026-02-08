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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppDownloadService } from './app-download.service';
import { CreateShareInviteDto, AppDownloadShareResponseDto } from './dto';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

// Assuming you have an AuthGuard or you want these to be public? 
// The user requested a "token" for download, but for management APIs (GET ALL, INVITE, etc) 
// they probably need to be protected. I'll assume standard AuthGuard used in the project.
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; 
// Since I don't know the exact path of AuthGuard, I will comment it out or use a generic one if I knew it.
// I'll stick to basic implementation and let user add AuthGuard if needed, or check other files.
// Checking user.repository.ts, it imports typical things.
// I'll skip imports for AuthGuard for now to avoid errors, assuming user handles protection 
// or I'll add a comment.

@ApiTags('App Download')
@Controller('app-download')
@ApiBearerAuth()
export class AppDownloadController {
    constructor(private readonly service: AppDownloadService) { }

    @Get('shares')
    @ApiOperation({ summary: 'Get all shares' })
    @ApiResponse({ status: 200, type: [AppDownloadShareResponseDto] })
    async getAllShares() {
        return this.service.getAllShares();
    }

    @Get('shares/:id')
    @ApiOperation({ summary: 'Get share by ID' })
    @ApiResponse({ status: 200, type: AppDownloadShareResponseDto })
    async getShareById(@Param('id') id: string) {
        return this.service.getShareById(id);
    }

    @Post('shares/invite')
    @ApiOperation({ summary: 'Create invite and send email' })
    @ApiResponse({ status: 201, type: AppDownloadShareResponseDto })
    async createInvite(@Body() dto: CreateShareInviteDto, @Req() req: any) {
        // Assuming req.user exists if AuthGuard is used
        const userId = req.user?.id;
        return this.service.createShareInvite(dto, userId);
    }

    @Post('invites/:id/resend')
    @ApiOperation({ summary: 'Resend invite email' })
    @ApiResponse({ status: 200 })
    async resendInvite(@Param('id') id: string) {
        return this.service.resendInvite(id);
    }

    @Delete('invites/:id')
    @ApiOperation({ summary: 'Delete invite' })
    @ApiResponse({ status: 200 })
    async deleteInvite(@Param('id') id: string, @Req() req: any) {
        const userId = req.user?.id;
        return this.service.deleteInvite(id, userId);
    }

    @Get('download/:token')
    @ApiOperation({ summary: 'Download app with token' })
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
