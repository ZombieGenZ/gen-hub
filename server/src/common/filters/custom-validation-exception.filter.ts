import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
    I18nValidationException,
    I18nContext,
    I18nService,
} from 'nestjs-i18n';
import { ResponseCode } from '../responses';

/**
 * Error item trong response
 */
interface ErrorItem {
    field: string;
    message: string;
}

/**
 * Custom Validation Exception Filter
 * Thay thế I18nValidationExceptionFilter để trả về format errors array
 * với messages đã được dịch theo ngôn ngữ của user
 *
 * Response format:
 * {
 *   "code": "error.validation",
 *   "message": "Dữ liệu đầu vào không hợp lệ",
 *   "success": false,
 *   "errors": [
 *     { "field": "email", "message": "Email là bắt buộc" },
 *     { "field": "password", "message": "Mật khẩu phải có ít nhất 8 ký tự" }
 *   ]
 * }
 */
@Catch(I18nValidationException)
export class CustomValidationExceptionFilter implements ExceptionFilter {
    constructor(
        private readonly i18n: I18nService<Record<string, unknown>>,
    ) { }

    catch(exception: I18nValidationException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        // Lấy ngôn ngữ từ context
        const i18nContext = I18nContext.current(host);
        const lang = i18nContext?.lang || 'vi';

        // Flatten và dịch validation errors
        const errors = this.flattenAndTranslateErrors(exception.errors, lang);

        // Dịch message chung
        const message = this.i18n.t('common.errors.validation_error_message', { lang }) as string;

        response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
            code: ResponseCode.ERROR_VALIDATION,
            message,
            success: false,
            errors,
        });
    }

    /**
     * Flatten nested validation errors và dịch messages
     */
    private flattenAndTranslateErrors(
        errors: I18nValidationException['errors'],
        lang: string,
        parentField = '',
    ): ErrorItem[] {
        const result: ErrorItem[] = [];

        for (const error of errors) {
            const field = parentField
                ? `${parentField}.${error.property}`
                : error.property;

            // Xử lý constraints (validation messages)
            if (error.constraints) {
                for (const constraintMessage of Object.values(error.constraints)) {
                    // Parse và dịch message
                    const translatedMessage = this.translateMessage(constraintMessage, lang);
                    result.push({ field, message: translatedMessage });
                }
            }

            // Xử lý nested children (cho nested objects)
            if (error.children && error.children.length > 0) {
                result.push(
                    ...this.flattenAndTranslateErrors(error.children, lang, field),
                );
            }
        }

        return result;
    }

    /**
     * Dịch message từ format "key|{args}" thành message đã dịch
     * Ví dụ: "auth.validation.name_min_length|{\"constraints\":[2]}" -> "Tên phải có ít nhất 2 ký tự"
     */
    private translateMessage(message: string, lang: string): string {
        // Message có format: "translation.key|{\"arg1\":\"value1\"}"
        const pipeIndex = message.indexOf('|');

        if (pipeIndex === -1) {
            // Không có pipe, thử dịch trực tiếp
            const translated = this.i18n.t(message, { lang });
            return typeof translated === 'string' ? translated : message;
        }

        const key = message.substring(0, pipeIndex);
        const argsString = message.substring(pipeIndex + 1);

        let args: Record<string, unknown> = {};
        try {
            args = JSON.parse(argsString);
        } catch {
            // Nếu parse lỗi, bỏ qua args
        }

        // Dịch message
        const translated = this.i18n.t(key, { lang, args });
        return typeof translated === 'string' ? translated : message;
    }
}
