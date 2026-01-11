import { IsArray, ValidateNested, IsString, MaxLength, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SyncMessageItemDto {
    @ApiProperty({ description: 'Agora message ID', example: 'msg_123abc' })
    @IsString({ message: 'org-chat.AGORA_MESSAGE_ID_MUST_BE_STRING' })
    agora_message_id: string;

    @ApiProperty({ description: 'Nội dung tin nhắn', example: 'Xin chào!' })
    @IsString({ message: 'org-chat.CONTENT_MUST_BE_STRING' })
    @MaxLength(5000, { message: 'org-chat.CONTENT_TOO_LONG' })
    content: string;

    @ApiProperty({ description: 'Thời gian gửi', example: '2025-01-11T07:00:00.000Z' })
    @IsOptional()
    @IsDateString({}, { message: 'org-chat.SENT_AT_MUST_BE_DATE' })
    sent_at?: string;
}

export class SyncMessagesDto {
    @ApiProperty({
        description: 'Danh sách tin nhắn cần sync',
        type: [SyncMessageItemDto],
    })
    @IsArray({ message: 'org-chat.MESSAGES_MUST_BE_ARRAY' })
    @ValidateNested({ each: true })
    @Type(() => SyncMessageItemDto)
    messages: SyncMessageItemDto[];
}
