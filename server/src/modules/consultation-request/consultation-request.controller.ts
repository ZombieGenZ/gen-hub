import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { Public, RequireAnyPermission, RequirePermission, CurrentUser } from '../../common/decorators';
import { CreatedResponse, DeletedResponse, GetResponse, UpdatedResponse } from '../../common/responses/success.response';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsultationRequestService } from './consultation-request.service';
import { CreateConsultationRequestDto } from './dto/create-consultation-request.dto';
import { QueryConsultationRequestDto } from './dto/query-consultation-request.dto';
import { UpdateConsultationRequestDto } from './dto/update-consultation-request.dto';

@ApiTags('Consultation Request')
@Controller('consultation-request')
export class ConsultationRequestController {
    constructor(
        private readonly service: ConsultationRequestService,
        private readonly prisma: PrismaService,
    ) { }

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
        if (user.system_permissions.some((item) => item.permission.key === permissionKey)) return true;
        return user.system_roles.some((role) => role.role.permissions.some((item) => item.permission.key === permissionKey));
    }

    @Post()
    @Public()
    @ApiOperation({ summary: 'Create consultation request' })
    @ApiBody({ type: CreateConsultationRequestDto })
    @ApiResponse({ status: 201, description: 'Consultation request created successfully' })
    async create(@Body() dto: CreateConsultationRequestDto) {
        const data = await this.service.createRequest(dto, null);
        return new CreatedResponse('consultation-request.create_success', data);
    }

    @Get()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('consultation-request.list', 'consultation-request.list.all')
    @ApiOperation({ summary: 'List consultation requests' })
    async findAll(@Query() query: QueryConsultationRequestDto, @CurrentUser('userId') userId: string) {
        const hasAll = await this.hasPermission(userId, 'consultation-request.list.all');
        return new GetResponse('consultation-request.list_success', await this.service.findAllRequests(query, hasAll ? undefined : userId));
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('consultation-request.read', 'consultation-request.read.all')
    @ApiOperation({ summary: 'Get consultation request detail' })
    async findOne(@Param('id') id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        const hasAll = await this.hasPermission(userId, 'consultation-request.read.all');
        return new GetResponse(
            'consultation-request.get_success',
            await this.service.findRequestById(id, req.headers['accept-language'] || 'vi', hasAll ? undefined : userId),
        );
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('consultation-request.update', 'consultation-request.update.all')
    @ApiOperation({ summary: 'Update consultation request' })
    async update(@Param('id') id: string, @Body() dto: UpdateConsultationRequestDto, @CurrentUser('userId') userId: string, @Request() req: any) {
        const hasAll = await this.hasPermission(userId, 'consultation-request.update.all');
        return new UpdatedResponse(
            'consultation-request.update_success',
            await this.service.updateRequest(id, dto, userId, req.headers['accept-language'] || 'vi', hasAll ? undefined : userId),
        );
    }

    @Patch(':id/assign')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequirePermission('consultation-request.assign')
    @ApiOperation({ summary: 'Assign consultation request' })
    async assign(@Param('id') id: string, @Body('assigned_to') assignedTo: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        return new UpdatedResponse(
            'consultation-request.assign_success',
            await this.service.assignRequest(id, assignedTo, userId, req.headers['accept-language'] || 'vi'),
        );
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @ApiBearerAuth('JWT-auth')
    @RequireAnyPermission('consultation-request.delete', 'consultation-request.delete.all')
    @ApiOperation({ summary: 'Delete consultation request' })
    async remove(@Param('id') id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
        const hasAll = await this.hasPermission(userId, 'consultation-request.delete.all');
        await this.service.softDeleteRequest(id, userId, req.headers['accept-language'] || 'vi', hasAll ? undefined : userId);
        return new DeletedResponse('consultation-request.delete_success');
    }
}
