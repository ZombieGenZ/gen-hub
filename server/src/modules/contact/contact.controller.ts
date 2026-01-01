import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { ContactService } from './contact.service';
import {
    CreateContactDto,
    QueryContactDto,
    UpdateContactDto,
    ReplyContactDto,
    AssignStaffDto,
} from './dto';
import { Public } from '../../common/decorators/public.decorator';
import {
    CreatedResponse,
    GetResponse,
    UpdatedResponse,
    DeletedResponse,
    OkResponse,
} from '../../common/responses/success.response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Controller cho Contact module
 * Bao gồm public endpoint và admin endpoints
 */
@ApiTags('Contact')
@Controller()
export class ContactController {
    constructor(private readonly contactService: ContactService) { }

    /**
     * Tạo ticket từ form website (public - không cần auth)
     */
    @Post('contact')
    @Public()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Gửi yêu cầu liên hệ từ form website (public)' })
    async createPublic(
        @Body() dto: CreateContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.createFromWebForm(dto, lang);
        return new CreatedResponse('contact.created', result, result.message);
    }

    /**
     * Lấy danh sách tickets - OPTIMIZED
     */
    @Get('admin/contacts')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách tickets liên hệ (optimized)' })
    async findAll(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findMany(query, lang);
        return new GetResponse('contact.list', result);
    }

    /**
     * Lấy chi tiết ticket
     */
    @Get('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.read')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy chi tiết ticket liên hệ' })
    async findOne(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findById(id, lang);
        return new GetResponse('contact.read', result);
    }

    /**
     * Lấy messages của ticket
     */
    @Get('admin/contacts/:id/messages')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.read')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách messages của ticket' })
    async findMessages(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findMessages(id, lang);
        return new GetResponse('contact.messages', result);
    }

    /**
     * Lấy danh sách staff được assign vào ticket
     */
    @Get('admin/contacts/:id/staff')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.read')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách staff được assign vào ticket' })
    async getAssignedStaff(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.getAssignedStaff(id, lang);
        return new GetResponse('contact.staff_list', result);
    }

    /**
     * Cập nhật ticket
     */
    @Patch('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.update')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật ticket (status, priority, assign, staff)' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateContactDto,
        @CurrentUser() user: { userId: string; name?: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.update(id, dto, user.userId, user.name || 'Admin', lang);
        return new UpdatedResponse('contact.updated', result);
    }

    /**
     * Assign staff vào ticket
     */
    @Post('admin/contacts/:id/assign-staff')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.assign')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Assign staff vào ticket' })
    async assignStaff(
        @Param('id') id: string,
        @Body() dto: AssignStaffDto,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.assignStaff(id, dto, user.userId, lang);
        return new OkResponse('contact.staff_assigned', result.assigned, result.message);
    }

    /**
     * Unassign staff khỏi ticket
     */
    @Delete('admin/contacts/:id/staff/:staffId')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.assign')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Unassign staff khỏi ticket' })
    async unassignStaff(
        @Param('id') id: string,
        @Param('staffId') staffId: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.unassignStaff(id, staffId, user.userId, lang);
        return new OkResponse('contact.staff_unassigned', null, result.message);
    }

    /**
     * Staff reply
     */
    @Post('admin/contacts/:id/reply')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.reply')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Staff trả lời ticket' })
    async reply(
        @Param('id') id: string,
        @Body() dto: ReplyContactDto,
        @CurrentUser() user: { userId: string; name?: string; email?: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.reply(
            id,
            dto,
            user.userId,
            user.name || 'Staff',
            user.email || '',
            lang,
        );
        return new OkResponse('contact.replied', null, result.message);
    }

    /**
     * Đóng ticket
     */
    @Post('admin/contacts/:id/close')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.update')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Đóng ticket' })
    async close(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.close(id, user.userId, lang);
        return new OkResponse('contact.closed', null, result.message);
    }

    /**
     * Xóa ticket
     */
    @Delete('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.delete')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Xóa ticket' })
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        await this.contactService.delete(id, user.userId, lang);
        return new DeletedResponse('contact.deleted');
    }

    /**
     * Xóa nhiều tickets
     */
    @Delete('admin/contacts/delete/many')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.delete')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Xóa nhiều tickets' })
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.deleteMany(ids, user.userId, lang);
        return new DeletedResponse('contact.deleted_many', result);
    }
}
