import { ApiProperty } from '@nestjs/swagger';
import { AppDownloadShare, AppDownloadInvite } from '@prisma/client';

export class AppDownloadShareResponseDto implements AppDownloadShare {
    @ApiProperty({ description: 'ID duy nhất của share', example: '550e8400-e29b-41d4-a716-446655440001' })
    id: string;

    @ApiProperty({ description: 'Token duy nhất để tải ứng dụng', example: 'abc123xyz789' })
    token: string;

    @ApiProperty({ description: 'Số lượt tải tối đa (-1 = không giới hạn)', example: 5 })
    max_download: number;

    @ApiProperty({ description: 'Số lượt đã tải hiện tại', example: 2 })
    current_download: number;

    @ApiProperty({ description: 'Link có vĩnh viễn hay không', example: false })
    is_permanent: boolean;

    @ApiProperty({ description: 'Ngày giờ hết hạn', example: '2024-12-31T23:59:59.000Z' })
    expires_at: Date;

    @ApiProperty({ description: 'Trạng thái hoạt động của link', example: true })
    is_active: boolean;

    @ApiProperty({ description: 'Ngày tạo', example: '2024-01-01T00:00:00.000Z' })
    created_at: Date;

    @ApiProperty({ description: 'Ngày cập nhật cuối', example: '2024-01-01T00:00:00.000Z' })
    updated_at: Date;

    @ApiProperty({ description: 'Đã bị xóa hay chưa', example: false })
    is_deleted: boolean;

    @ApiProperty({ description: 'Ngày xóa', example: null, nullable: true })
    deleted_at: Date;

    @ApiProperty({ description: 'ID người tạo', example: '550e8400-e29b-41d4-a716-446655440002' })
    created_by: string;

    @ApiProperty({ description: 'ID người xóa', example: null, nullable: true })
    deleted_by: string;

    @ApiProperty({
        type: () => [Object],
        description: 'Danh sách lời mời email liên quan đến share này',
        required: false
    })
    invites?: AppDownloadInvite[];
}
