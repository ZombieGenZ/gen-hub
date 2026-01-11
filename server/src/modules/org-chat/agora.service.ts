/**
 * Agora Service - Xử lý token generation cho RTM và RTC
 * RTM (Real-Time Messaging): Cho chat messaging
 * RTC (Real-Time Communication): Cho video/voice call
 */
import { Injectable, Logger } from '@nestjs/common';
import { RtmTokenBuilder, RtmRole, RtcTokenBuilder, RtcRole } from 'agora-access-token';

@Injectable()
export class AgoraService {
    private readonly logger = new Logger(AgoraService.name);
    private readonly appId: string;
    private readonly appCertificate: string;
    private readonly tokenExpirationSeconds: number;

    constructor() {
        this.appId = process.env.AGORA_APP_ID || '';
        this.appCertificate = process.env.AGORA_APP_CERTIFICATE || '';
        this.tokenExpirationSeconds = parseInt(
            process.env.AGORA_TOKEN_EXPIRATION_SECONDS || '3600',
        );

        if (!this.appId || !this.appCertificate) {
            this.logger.warn('Agora credentials chưa được cấu hình. Video/Voice call sẽ không hoạt động.');
        }
    }

    /**
     * Kiểm tra Agora đã được cấu hình chưa
     */
    isConfigured(): boolean {
        return !!this.appId && !!this.appCertificate;
    }

    /**
     * Lấy App ID cho client
     */
    getAppId(): string {
        return this.appId;
    }

    /**
     * Generate RTM token cho chat messaging
     * @param userId - User ID (sẽ dùng làm Agora user account)
     */
    generateRtmToken(userId: string): string {
        if (!this.isConfigured()) {
            throw new Error('Agora chưa được cấu hình');
        }

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + this.tokenExpirationSeconds;

        return RtmTokenBuilder.buildToken(
            this.appId,
            this.appCertificate,
            userId,
            RtmRole.Rtm_User,
            privilegeExpiredTs,
        );
    }

    /**
     * Generate RTC token cho video/voice call
     * @param channelName - Tên channel (thường là orgId hoặc callId)
     * @param uid - Unique ID cho user trong channel
     */
    generateRtcToken(channelName: string, uid: number): string {
        if (!this.isConfigured()) {
            throw new Error('Agora chưa được cấu hình');
        }

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + this.tokenExpirationSeconds;

        return RtcTokenBuilder.buildTokenWithUid(
            this.appId,
            this.appCertificate,
            channelName,
            uid,
            RtcRole.PUBLISHER,
            privilegeExpiredTs,
        );
    }

    /**
     * Generate unique Agora UID từ user ID
     * Agora UID là số nguyên 32-bit, hash user UUID để tạo
     */
    generateAgoraUid(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Đảm bảo là số dương và trong range hợp lệ
        return Math.abs(hash) % 2147483647;
    }
}
