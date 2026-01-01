import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsInt,
    Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo mới FAQ
 */
export class CreateFaqDto {
    @ApiProperty({ description: 'Câu hỏi', example: 'Làm sao để đăng ký tài khoản?' })
    @IsNotEmpty({
        message: i18nValidationMessage('faq.validation.question_required'),
    })
    @IsString({
        message: i18nValidationMessage('faq.validation.question_string'),
    })
    question: string;

    @ApiProperty({ description: 'Câu trả lời', example: 'Bạn có thể đăng ký bằng cách nhấn vào nút Đăng ký...' })
    @IsNotEmpty({
        message: i18nValidationMessage('faq.validation.answer_required'),
    })
    @IsString({
        message: i18nValidationMessage('faq.validation.answer_string'),
    })
    answer: string;

    @ApiPropertyOptional({ description: 'Thứ tự hiển thị', default: 0 })
    @IsOptional()
    @IsInt({
        message: i18nValidationMessage('faq.validation.order_integer'),
    })
    @Min(0, {
        message: i18nValidationMessage('faq.validation.order_min'),
    })
    order?: number;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('faq.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
