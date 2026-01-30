import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { WarehouseVisitService } from './warehouse-visit.service';
import { CreateWarehouseVisitBookingDto } from './dto/create-warehouse-visit-booking.dto';
import { UpdateWarehouseVisitBookingDto } from './dto/update-warehouse-visit-booking.dto';
import { RescheduleWarehouseVisitBookingDto } from './dto/reschedule-warehouse-visit-booking.dto';
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
    @ApiOperation({ summary: 'Create a new visit booking', description: 'Tạo lịch hẹn tham quan kho mới' })
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('warehouse-visit.create')
    @ApiBearerAuth()
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
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        visitor_name: { type: 'string' },
                        status: { type: 'string', example: 'PENDING' },
                        booking_code: { type: 'string', example: 'WV-20240215-XXXX' }
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
    @ApiBearerAuth()
    @RequireAnyPermission('warehouse-visit.list', 'warehouse-visit.list.all')
    @ApiOperation({ summary: 'Get all visit bookings with pagination', description: 'Lấy danh sách lịch hẹn tham quan' })
    @ApiAuthResponses()
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Lọc theo trạng thái' })
    @ApiQuery({ name: 'date', required: false, type: String, description: 'Lọc theo ngày (YYYY-MM-DD)' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách lịch hẹn',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            visitor_name: { type: 'string' },
                            visit_date: { type: 'string' },
                            status: { type: 'string' }
                        }
                    }
                },
                meta: {
                    type: 'object',
                    properties: {
                        total: { type: 'number' },
                        page: { type: 'number' },
                        limit: { type: 'number' },
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
    @ApiBearerAuth()
    @RequireAnyPermission('warehouse-visit.read', 'warehouse-visit.read.all')
    @ApiOperation({ summary: 'Get a visit booking by id', description: 'Lấy chi tiết lịch hẹn tham quan' })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của lịch hẹn' })
    @ApiResponse({
        status: 200,
        description: 'Thông tin chi tiết lịch hẹn',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                visitor_name: { type: 'string' },
                visit_date: { type: 'string' },
                history: { type: 'array', items: { type: 'object' } }
            }
        }
    })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasReadAll = await this.hasPermission(userId, 'warehouse-visit.read.all');
        return this.warehouseVisitService.findBookingById(id, lang, hasReadAll ? undefined : userId);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth()
    @RequireAnyPermission('warehouse-visit.update', 'warehouse-visit.update.all')
    @ApiOperation({ summary: 'Update a visit booking', description: 'Cập nhật trạng thái hoặc ghi chú lịch hẹn' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'id', description: 'ID của lịch hẹn' })
    @ApiBody({
        type: UpdateWarehouseVisitBookingDto,
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
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseVisitBookingDto, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasUpdateAll = await this.hasPermission(userId, 'warehouse-visit.update.all');
        return this.warehouseVisitService.updateBooking(id, dto, userId, lang, hasUpdateAll ? undefined : userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth()
    @RequireAnyPermission('warehouse-visit.delete', 'warehouse-visit.delete.all')
    @ApiOperation({ summary: 'Soft delete a visit booking', description: 'Xóa lịch hẹn (soft delete)' })
    @ApiAuthResponses()
    @ApiParam({ name: 'id', description: 'ID của lịch hẹn' })
    async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const hasDeleteAll = await this.hasPermission(userId, 'warehouse-visit.delete.all');
        return this.warehouseVisitService.softDeleteBooking(id, userId, lang, hasDeleteAll ? undefined : userId);
    }

    @Post(':id/reschedule')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth()
    @RequireAnyPermission('warehouse-visit.update', 'warehouse-visit.update.all')
    @ApiOperation({ summary: 'Reschedule a visit booking', description: 'Đổi lịch hẹn sang ngày/giờ khác' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiParam({ name: 'id', description: 'ID của lịch hẹn' })
    @ApiBody({
        type: RescheduleWarehouseVisitBookingDto,
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
