import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO cho lấy download URL của backup
 */
export class GetDownloadUrlDto {
  @ApiProperty({
    description: 'Key bảo mật để xác thực',
    example: 'your_secure_backup_key',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('database-backup.validation.key_required'),
  })
  @IsString({
    message: i18nValidationMessage('database-backup.validation.key_string'),
  })
  key: string;
}

/**
 * DTO cho param backup ID
 */
export class BackupIdParamDto {
  @ApiProperty({
    description: 'ID của backup',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', {
    message: i18nValidationMessage('database-backup.validation.id_uuid'),
  })
  id: string;
}
