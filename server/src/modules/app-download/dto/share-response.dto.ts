import { ApiProperty } from '@nestjs/swagger';
import { AppDownloadShare, AppDownloadInvite } from '@prisma/client';

export class AppDownloadShareResponseDto implements AppDownloadShare {
    @ApiProperty()
    id: string;

    @ApiProperty()
    token: string;

    @ApiProperty()
    max_download: number;

    @ApiProperty()
    current_download: number;

    @ApiProperty()
    is_permanent: boolean;

    @ApiProperty()
    expires_at: Date;

    @ApiProperty()
    is_active: boolean;

    @ApiProperty()
    created_at: Date;

    @ApiProperty()
    updated_at: Date;

    @ApiProperty()
    is_deleted: boolean;

    @ApiProperty()
    deleted_at: Date;

    @ApiProperty()
    created_by: string;

    @ApiProperty()
    deleted_by: string;

    @ApiProperty({ type: () => [Object] })
    invites?: AppDownloadInvite[];
}
