import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Nội dung tin nhắn', example: 'Xin chào!' })
  @IsString({ message: 'org-chat.CONTENT_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'org-chat.CONTENT_REQUIRED' })
  @MaxLength(5000, { message: 'org-chat.CONTENT_TOO_LONG' })
  content: string;
}
