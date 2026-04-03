import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * Decorator cho các response 401 Unauthorized phổ biến
 * Sử dụng cho các API yêu cầu xác thực
 */
export function ApiUnauthorizedResponses() {
    return applyDecorators(
        ApiResponse({
            status: 401,
            description: 'Unauthorized - Chưa xác thực hoặc token không hợp lệ',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['code', 'message', 'success'],
                        properties: {
                            code: {
                                type: 'string',
                                example: 'error.unauthorized.token_expired',
                            },
                            message: {
                                type: 'string',
                                example: 'Token đã hết hạn',
                            },
                            success: {
                                type: 'boolean',
                                example: false,
                            },
                        },
                    },
                    examples: {
                        token_missing: {
                            summary: 'Không có token',
                            value: {
                                code: 'error.unauthorized.token_missing',
                                message: 'Không có quyền truy cập',
                                success: false,
                            },
                        },
                        token_expired: {
                            summary: 'Token hết hạn',
                            value: {
                                code: 'error.unauthorized.token_expired',
                                message: 'Token đã hết hạn',
                                success: false,
                            },
                        },
                        token_invalid: {
                            summary: 'Token không hợp lệ',
                            value: {
                                code: 'error.unauthorized.token_invalid',
                                message: 'Token không hợp lệ',
                                success: false,
                            },
                        },
                        token_malformed: {
                            summary: 'Token không đúng định dạng',
                            value: {
                                code: 'error.unauthorized.token_malformed',
                                message: 'Token không đúng định dạng',
                                success: false,
                            },
                        },
                    },
                },
            },
        }),
    );
}

/**
 * Decorator cho các response 403 Forbidden phổ biến
 * Sử dụng cho các API yêu cầu quyền truy cập
 */
export function ApiForbiddenResponses() {
    return applyDecorators(
        ApiResponse({
            status: 403,
            description: 'Forbidden - Không có quyền truy cập',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['code', 'message', 'success'],
                        properties: {
                            code: {
                                type: 'string',
                                example: 'error.forbidden.account_not_found',
                            },
                            message: {
                                type: 'string',
                                example: 'Tài khoản không tồn tại',
                            },
                            success: {
                                type: 'boolean',
                                example: false,
                            },
                        },
                    },
                    examples: {
                        no_permission: {
                            summary: 'Không có quyền thực hiện',
                            value: {
                                code: 'error.forbidden.no_permission',
                                message: 'Không có quyền thực hiện thao tác này',
                                success: false,
                            },
                        },
                        account_banned: {
                            summary: 'Tài khoản bị khóa',
                            value: {
                                code: 'error.forbidden.account_banned',
                                message: 'Tài khoản đã bị khóa',
                                success: false,
                            },
                        },
                        account_not_verified: {
                            summary: 'Tài khoản chưa xác minh',
                            value: {
                                code: 'error.forbidden.account_not_verified',
                                message:
                                    'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
                                success: false,
                            },
                        },
                        account_not_found: {
                            summary: 'Tài khoản không tồn tại',
                            value: {
                                code: 'error.forbidden.account_not_found',
                                message: 'Tài khoản không tồn tại',
                                success: false,
                            },
                        },
                    },
                },
            },
        }),
    );
}

/**
 * Decorator kết hợp cả 401 và 403 responses
 * Sử dụng cho tất cả các API protected (yêu cầu xác thực + phân quyền)
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @ApiAuthResponses()
 * @ApiOperation({ summary: 'Lấy thông tin người dùng' })
 * async getProfile() {
 *   // ...
 * }
 * ```
 */
export function ApiAuthResponses() {
    return applyDecorators(ApiUnauthorizedResponses(), ApiForbiddenResponses());
}

/**
 * Decorator cho response 422 Unprocessable Entity (Validation Error)
 * Sử dụng cho các API có validation input data
 *
 * @example
 * ```typescript
 * @Post()
 * @ApiValidationErrorResponse()
 * @ApiOperation({ summary: 'Tạo mới tài nguyên' })
 * async create(@Body() dto: CreateDto) {
 *   // ...
 * }
 * ```
 */
export function ApiValidationErrorResponse() {
    return applyDecorators(
        ApiResponse({
            status: 422,
            description: 'Unprocessable Entity - Dữ liệu không hợp lệ',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            code: { type: 'string', example: 'error.validation' },
                            message: { type: 'string', example: 'Dữ liệu đầu vào không hợp lệ' },
                            success: { type: 'boolean', example: false },
                            errors: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        field: { type: 'string', example: 'email' },
                                        message: { type: 'string', example: 'Email không hợp lệ' },
                                    },
                                },
                            },
                        },
                    },
                    example: {
                        code: 'error.validation',
                        message: 'Dữ liệu đầu vào không hợp lệ',
                        success: false,
                        errors: [
                            { field: 'email', message: 'Email không hợp lệ' },
                            { field: 'password', message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                        ],
                    },
                },
            },
        }),
    );
}
