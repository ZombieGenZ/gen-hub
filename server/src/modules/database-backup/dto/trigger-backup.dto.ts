import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO cho trigger backup thủ công
 */
export class TriggerBackupDto {
    @ApiProperty({
        description: 'Key bảo mật để trigger backup',
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
