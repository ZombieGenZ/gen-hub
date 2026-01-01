import {
    IsArray,
    IsUUID,
    ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO assign staff vào conversation
 */
export class AssignStaffDto {
    @ApiProperty({
        description: 'Danh sách staff IDs để assign',
        type: [String],
        example: ['uuid1', 'uuid2']
    })
    @IsArray()
    @ArrayMinSize(1, { message: i18nValidationMessage('validation.ARRAY_MIN_SIZE', { count: 1 }) })
    @IsUUID('4', { each: true, message: i18nValidationMessage('validation.INVALID_UUID') })
    staff_ids: string[];
}
