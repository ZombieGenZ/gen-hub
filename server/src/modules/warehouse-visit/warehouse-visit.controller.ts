import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { WarehouseVisitService } from './warehouse-visit.service';
import { CreateWarehouseVisitBookingDto } from './dto/create-warehouse-visit-booking.dto';
import { UpdateWarehouseVisitBookingDto } from './dto/update-warehouse-visit-booking.dto';
import { RescheduleWarehouseVisitBookingDto } from './dto/reschedule-warehouse-visit-booking.dto';
import { ApproveWarehouseVisitBookingDto } from './dto/approve-warehouse-visit-booking.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission, RequireAnyPermission, CurrentUser } from '../../common/decorators';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Warehouse Visit Booking')
@Controller('warehouse-visit')
export class WarehouseVisitController {
    constructor(
        private readonly warehouseVisitService: WarehouseVisitService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Kiểm tra user có permission cụ thể không
     */
    private async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            include: {
                system_roles: {
                    where: { is_deleted: false, is_active: true },
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    where: { is_deleted: false, is_active: true },
                                    include: { permission: true },
                                },
                            },
                        },
                    },
                },
                system_permissions: {
                    where: { is_deleted: false, is_active: true },
                    include: { permission: true },
                },
            },
        });

        if (!user) return false;

        // Check direct permissions
        const hasDirectPerm = user.system_permissions.some(
            (p) => p.permission.key === permissionKey,
        );
        if (hasDirectPerm) return true;

        // Check role permissions
        const hasRolePerm = user.system_roles.some((ur) =>
            ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
        );
        return hasRolePerm;
    }

    @Post()
    @ApiOperation({
        summary: 'Tạo lịch hẹn tham quan',
        description: 'Tạo mới một lịch hẹn tham quan kho. Yêu cầu quyền `warehouse-visit.create`.'
    })
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('warehouse-visit.create')
    @ApiBearerAuth('JWT-auth')
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBody({
        type: CreateWarehouseVisitBookingDto,
        description: 'Thông tin lịch hẹn',
        examples: {
            example_1: {
                summary: 'Tạo lịch hẹn tham quan',
                value: {
                    warehouse_template_id: '550e8400-e29b-41d4-a716-446655440000',
                    visitor_name: 'Nguyễn Văn Khách',
                    visitor_email: 'khach@example.com',
                    visitor_phone: '0909123456',
                    visit_date: '2024-02-15',
                    visit_time_start: '09:00',
                    visit_time_end: '11:00',
                    purpose: 'RENTAL_INQUIRY',
                    number_of_visitors: 2
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo lịch hẹn thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.create_success' },
                message: { type: 'string', example: 'Tạo lịch hẹn thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        visitor_name: { type: 'string' },
                        status: { type: 'string', example: 'PENDING' },
                        booking_code: { type: 'string', example: 'WV-20240215-XXXX' },
                        created_at: { type: 'string', format: 'date-time' },
                    }
                }
            }
        }
    })
    create(@Body() dto: CreateWarehouseVisitBookingDto, @Request() req: any) {
        return this.warehouseVisitService.createBooking(dto, req.user?.id);
    }

    @Get()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('warehouse-visit.list', 'warehouse-visit.list.all')
    @ApiOperation({
        summary: 'Lấy danh sách lịch hẹn',
        description: 'Lấy danh sách lịch hẹn tham quan có phân trang và lọc theo trạng thái/ngày.'
    })
    @ApiAuthResponses()
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Trang hiện tại' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Số lượng record mỗi trang' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Lọc theo trạng thái', example: 'PENDING' })
    @ApiQuery({ name: 'date', required: false, type: String, description: 'Lọc theo ngày (YYYY-MM-DD)', example: '2024-02-15' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.list_success' },
                message: { type: 'string', example: 'Lấy danh sách lịch hẹn thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    visitor_name: { type: 'string' },
                                    visit_date: { type: 'string' },
                                    visit_time_start: { type: 'string' },
                                    visit_time_end: { type: 'string' },
                                    status: { type: 'string' },
                                    booking_code: { type: 'string' },
                                    warehouse_template: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            name: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                page: { type: 'number' },
                                limit: { type: 'number' },
                                totalPages: { type: 'number' },
                            }
                        }
                    }
                }
            }
        }
    })
    async findAll(@Query() query: any, @CurrentUser('userId') userId: string) {
        const hasListAll = await this.hasPermission(userId, 'warehouse-visit.list.all');
        return this.warehouseVisitService.findAllBookings(query, hasListAll ? undefined : userId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('warehouse-visit.read', 'warehouse-visit.read.all')
    @ApiOperation({
        summary: 'Lấy chi tiết lịch hẹn',
        description: 'Lấy thông tin chi tiết của một lịch hẹn tham quan bao gồm lịch sử booking.'
    })
    @ApiAuthResponses()
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của lịch hẹn (UUID)',
        example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.get_success' },
                message: { type: 'string', example: 'Lấy thông tin lịch hẹn thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        visitor_name: { type: 'string' },
                        visitor_email: { type: 'string' },
                        visitor_phone: { type: 'string' },
                        visit_date: { type: 'string' },
                        status: { type: 'string' },
                        history: { type: 'array', items: { type: 'object' } },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy lịch hẹn',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.not_found' },
                message: { type: 'string', example: 'Không tìm thấy lịch hẹn' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasReadAll = await this.hasPermission(userId, 'warehouse-visit.read.all');
        return this.warehouseVisitService.findBookingById(id, lang, hasReadAll ? undefined : userId);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('warehouse-visit.update', 'warehouse-visit.update.all')
    @ApiOperation({
        summary: 'Cập nhật lịch hẹn',
        description: 'Cập nhật trạng thái hoặc ghi chú của lịch hẹn.'
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của lịch hẹn (UUID)',
        example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c'
    })
    @ApiBody({
        type: UpdateWarehouseVisitBookingDto,
        description: 'Thông tin cập nhật',
        examples: {
            example_1: {
                summary: 'Xác nhận lịch hẹn',
                value: {
                    status: 'CONFIRMED',
                    confirmation_notes: 'Đã gọi điện xác nhận với khách'
                }
            },
            example_2: {
                summary: 'Hoàn thành chuyến tham quan',
                value: {
                    status: 'COMPLETED',
                    completion_notes: 'Khách quan tâm đến khu vực A',
                    visitor_feedback: 'Kho sạch sẽ, thoáng mát'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.update_success' },
                message: { type: 'string', example: 'Cập nhật lịch hẹn thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'object' },
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy lịch hẹn',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.not_found' },
                message: { type: 'string', example: 'Không tìm thấy lịch hẹn' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseVisitBookingDto, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasUpdateAll = await this.hasPermission(userId, 'warehouse-visit.update.all');
        return this.warehouseVisitService.updateBooking(id, dto, userId, lang, hasUpdateAll ? undefined : userId);
    }

    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequirePermission('warehouse-visit.approve')
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiOperation({
        summary: 'Duyệt hoặc từ chối lịch hẹn tham quan',
        description: 'Xử lý một lịch hẹn đang ở trạng thái chờ duyệt. Khi duyệt, hệ thống sẽ chuyển trạng thái sang `CONFIRMED`; khi từ chối, hệ thống sẽ chuyển sang `CANCELLED` và có thể gửi email thông báo cho khách.',
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của lịch hẹn cần duyệt hoặc từ chối.',
        example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c'
    })
    @ApiBody({
        type: ApproveWarehouseVisitBookingDto,
        description: 'Thông tin xử lý lịch hẹn tham quan.',
        examples: {
            approve: {
                summary: 'Duyệt lịch hẹn',
                value: {
                    action: 'APPROVE',
                    confirmation_notes: 'Đã xác nhận lịch tham quan với khách vào 09:00 ngày 20/03.'
                }
            },
            reject: {
                summary: 'Từ chối lịch hẹn',
                value: {
                    action: 'REJECT',
                    rejection_reason: 'Khung giờ khách chọn đã kín, vui lòng chọn lịch khác.'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Xử lý duyệt hoặc từ chối lịch hẹn thành công.',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.update_success' },
                message: { type: 'string', example: 'Xử lý lịch hẹn tham quan thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c' },
                        status: { type: 'string', example: 'CONFIRMED' },
                        confirmation_notes: { type: 'string', example: 'Đã xác nhận lịch tham quan với khách vào 09:00 ngày 20/03.' },
                        cancel_reason: { type: 'string', example: null, nullable: true },
                        updated_at: { type: 'string', format: 'date-time' },
                    }
                }
            },
            example: {
                code: 'warehouse_visit.update_success',
                message: 'Xử lý lịch hẹn tham quan thành công',
                success: true,
                data: {
                    id: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c',
                    status: 'CONFIRMED',
                    confirmation_notes: 'Đã xác nhận lịch tham quan với khách vào 09:00 ngày 20/03.',
                    cancel_reason: null,
                    updated_at: '2026-03-12T09:30:00.000Z'
                }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy lịch hẹn cần xử lý.',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'Không tìm thấy lịch hẹn tham quan kho' },
                error: { type: 'string', example: 'Not Found' },
            },
        },
    })
    async approve(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveWarehouseVisitBookingDto,
        @CurrentUser('userId') userId: string,
        @Request() req: any,
    ) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseVisitService.approveBooking(id, dto, userId, lang);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('warehouse-visit.delete', 'warehouse-visit.delete.all')
    @ApiOperation({
        summary: 'Xóa lịch hẹn',
        description: 'Xóa mềm (soft delete) lịch hẹn khỏi hệ thống.'
    })
    @ApiAuthResponses()
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của lịch hẹn (UUID)',
        example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c'
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.delete_success' },
                message: { type: 'string', example: 'Xóa lịch hẹn thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'null' },
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy lịch hẹn',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.not_found' },
                message: { type: 'string', example: 'Không tìm thấy lịch hẹn' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasDeleteAll = await this.hasPermission(userId, 'warehouse-visit.delete.all');
        return this.warehouseVisitService.softDeleteBooking(id, userId, lang, hasDeleteAll ? undefined : userId);
    }

    @Post(':id/reschedule')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('warehouse-visit.update', 'warehouse-visit.update.all')
    @ApiOperation({
        summary: 'Đổi lịch hẹn',
        description: 'Thay đổi ngày giờ của lịch hẹn tham quan.'
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của lịch hẹn (UUID)',
        example: 'b2f76b83-ce55-49bc-955c-4ddf49bc955c'
    })
    @ApiBody({
        type: RescheduleWarehouseVisitBookingDto,
        description: 'Thông tin đổi lịch',
        examples: {
            example_1: {
                summary: 'Đổi lịch sang tuần sau',
                value: {
                    visit_date: '2024-02-22',
                    visit_time_start: '10:00',
                    visit_time_end: '12:00',
                    reason: 'Khách bận đột xuất'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Đổi lịch thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.reschedule_success' },
                message: { type: 'string', example: 'Đổi lịch hẹn thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        visit_date: { type: 'string' },
                        visit_time_start: { type: 'string' },
                        visit_time_end: { type: 'string' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy lịch hẹn',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warehouse_visit.not_found' },
                message: { type: 'string', example: 'Không tìm thấy lịch hẹn' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    async reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RescheduleWarehouseVisitBookingDto, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasUpdateAll = await this.hasPermission(userId, 'warehouse-visit.update.all');
        return this.warehouseVisitService.rescheduleBooking(
            id,
            dto.visit_date,
            dto.visit_time_start,
            dto.visit_time_end,
            userId,
            lang,
            dto.reason,
            hasUpdateAll ? undefined : userId,
        );
    }
}

