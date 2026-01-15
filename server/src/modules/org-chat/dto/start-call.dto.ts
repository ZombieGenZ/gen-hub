import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChatCallType } from '@prisma/client';

export class StartCallDto {
    @ApiProperty({
        description: 'Loại cuộc gọi',
        enum: ChatCallType,
        example: 'VIDEO',
    })
    @IsEnum(ChatCallType, { message: 'org-chat.INVALID_CALL_TYPE' })
    call_type: ChatCallType;
}
