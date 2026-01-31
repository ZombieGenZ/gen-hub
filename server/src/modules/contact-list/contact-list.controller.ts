import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ContactListService } from './contact-list.service';
import {
    CreateContactListDto,
    UpdateContactListDto,
    QueryContactListDto,
    EmailQuickActionDto,
    DomainQuickActionDto,
    IpQuickActionDto,
    RegionCountryQuickActionDto,
    RegionCityQuickActionDto,
    DeleteByValueDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses/success.response';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators/api-common-responses.decorator';

@ApiTags('Contact List (Blacklist/Whitelist)')
@Controller('admin/contact-list')
export class ContactListController {
    constructor(private readonly contactListService: ContactListService) { }

    @Post()
    @ApiOperation({
        summary: 'Tạo Contact List entry mới',
        description: 'Thêm thủ công một item vào danh sách chặn/cho phép.'
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: CreateContactListDto })
    @ApiResponse({
        status: 201,
        description: 'Tạo thành công',
        schema: {
            example: {
                code: 'contactList.created',
                message: 'Đã tạo entry thành công',
                success: true,
                data: { id: '...', type: 'EMAIL', value: 'spam@example.com', list_type: 'BLACKLIST' }
            }
        }
    })
    async create(
        @Body() dto: CreateContactListDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const entry = await this.contactListService.create(dto, userId, lang);
        return new CreatedResponse('contactList.created', entry, 'Đã tạo entry thành công');
    }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách Contact List entries',
        description: 'Lấy danh sách blacklist/whitelist với bộ lọc.'
    })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.list')
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    @ApiQuery({ name: 'type', required: false, enum: ['EMAIL', 'DOMAIN', 'IP', 'PHONE', 'COUNTRY', 'CITY'] })
    @ApiQuery({ name: 'list_type', required: false, enum: ['BLACKLIST', 'WHITELIST'] })
    async findAll(@Query() query: QueryContactListDto) {
        const result = await this.contactListService.findAll(query);
        return new GetResponse('contactList.list', result, 'Lấy danh sách thành công');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết Contact List entry' })
    @ApiParam({ name: 'id', description: 'ID entry (UUID)' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.read')
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const entry = await this.contactListService.findById(id, lang);
        return new GetResponse('contactList.read', entry, 'Lấy chi tiết thành công');
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật Contact List entry' })
    @ApiParam({ name: 'id', description: 'ID entry (UUID)' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.update')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateContactListDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const entry = await this.contactListService.update(id, dto, userId, lang);
        return new UpdatedResponse('contactList.updated', entry, 'Đã cập nhật thành công');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa Contact List entry' })
    @ApiParam({ name: 'id', description: 'ID entry (UUID)' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.contactListService.delete(id, userId, lang);
        return new DeletedResponse('contactList.deleted', null, 'Đã xóa thành công');
    }

    @Delete('delete/many')
    @ApiOperation({ summary: 'Xóa nhiều Contact List entries' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.contactListService.deleteMany(ids, userId, lang);
        return new DeletedResponse('contactList.deletedMany', null, 'Đã xóa các entries thành công');
    }

    // --- QUICK ACTIONS ---

    @Post('email/blacklist')
    @ApiOperation({ summary: 'Quick Action: Thêm email vào blacklist' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: EmailQuickActionDto })
    async addEmailToBlacklist(
        @Body() dto: EmailQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addEmailToBlacklist(dto.email, dto.reason, userId);
        return new CreatedResponse('contactList.email_blacklisted', entry, 'Đã thêm email vào blacklist');
    }

    @Delete('email/blacklist')
    @ApiOperation({ summary: 'Quick Action: Xóa email khỏi blacklist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: DeleteByValueDto })
    async removeEmailFromBlacklist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeEmailFromBlacklist(dto.value, userId);
        return new DeletedResponse('contactList.email_removed_blacklist', null, 'Đã xóa email khỏi blacklist');
    }

    @Post('email/whitelist')
    @ApiOperation({ summary: 'Quick Action: Thêm email vào whitelist' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: EmailQuickActionDto })
    async addEmailToWhitelist(
        @Body() dto: EmailQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addEmailToWhitelist(dto.email, dto.reason, userId);
        return new CreatedResponse('contactList.email_whitelisted', entry, 'Đã thêm email vào whitelist');
    }

    @Delete('email/whitelist')
    @ApiOperation({ summary: 'Quick Action: Xóa email khỏi whitelist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: DeleteByValueDto })
    async removeEmailFromWhitelist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeEmailFromWhitelist(dto.value, userId);
        return new DeletedResponse('contactList.email_removed_whitelist', null, 'Đã xóa email khỏi whitelist');
    }

    @Post('domain/blacklist')
    @ApiOperation({ summary: 'Quick Action: Thêm domain vào blacklist' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: DomainQuickActionDto })
    async addDomainToBlacklist(
        @Body() dto: DomainQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addDomainToBlacklist(dto.domain, dto.reason, userId);
        return new CreatedResponse('contactList.domain_blacklisted', entry, 'Đã thêm domain vào blacklist');
    }

    @Delete('domain/blacklist')
    @ApiOperation({ summary: 'Quick Action: Xóa domain khỏi blacklist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: DeleteByValueDto })
    async removeDomainFromBlacklist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeDomainFromBlacklist(dto.value, userId);
        return new DeletedResponse('contactList.domain_removed_blacklist', null, 'Đã xóa domain khỏi blacklist');
    }

    @Post('domain/whitelist')
    @ApiOperation({ summary: 'Quick Action: Thêm domain vào whitelist' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: DomainQuickActionDto })
    async addDomainToWhitelist(
        @Body() dto: DomainQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addDomainToWhitelist(dto.domain, dto.reason, userId);
        return new CreatedResponse('contactList.domain_whitelisted', entry, 'Đã thêm domain vào whitelist');
    }

    @Delete('domain/whitelist')
    @ApiOperation({ summary: 'Quick Action: Xóa domain khỏi whitelist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: DeleteByValueDto })
    async removeDomainFromWhitelist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeDomainFromWhitelist(dto.value, userId);
        return new DeletedResponse('contactList.domain_removed_whitelist', null, 'Đã xóa domain khỏi whitelist');
    }

    @Post('ip/blacklist')
    @ApiOperation({ summary: 'Quick Action: Thêm IP vào blacklist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: IpQuickActionDto })
    async addIPToBlacklist(
        @Body() dto: IpQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addIPToBlacklist(dto.ip, dto.reason, userId);
        return new CreatedResponse('contactList.ip_blacklisted', entry, 'Đã thêm IP vào blacklist');
    }

    @Delete('ip/blacklist')
    @ApiOperation({ summary: 'Quick Action: Xóa IP khỏi blacklist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: DeleteByValueDto })
    async removeIPFromBlacklist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeIPFromBlacklist(dto.value, userId);
        return new DeletedResponse('contactList.ip_removed_blacklist', null, 'Đã xóa IP khỏi blacklist');
    }

    @Post('ip/whitelist')
    @ApiOperation({ summary: 'Quick Action: Thêm IP vào whitelist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: IpQuickActionDto })
    async addIPToWhitelist(
        @Body() dto: IpQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addIPToWhitelist(dto.ip, dto.reason, userId);
        return new CreatedResponse('contactList.ip_whitelisted', entry, 'Đã thêm IP vào whitelist');
    }

    @Delete('ip/whitelist')
    @ApiOperation({ summary: 'Quick Action: Xóa IP khỏi whitelist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: DeleteByValueDto })
    async removeIPFromWhitelist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeIPFromWhitelist(dto.value, userId);
        return new DeletedResponse('contactList.ip_removed_whitelist', null, 'Đã xóa IP khỏi whitelist');
    }

    @Post('region/country/blacklist')
    @ApiOperation({ summary: 'Quick Action: Thêm quốc gia vào blacklist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: RegionCountryQuickActionDto })
    async addCountryToBlacklist(
        @Body() dto: RegionCountryQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addCountryToBlacklist(dto.country_code, dto.reason, userId);
        return new CreatedResponse('contactList.country_blacklisted', entry, 'Đã thêm quốc gia vào blacklist');
    }

    @Delete('region/country/blacklist')
    @ApiOperation({ summary: 'Quick Action: Xóa quốc gia khỏi blacklist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: DeleteByValueDto })
    async removeCountryFromBlacklist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeCountryFromBlacklist(dto.value, userId);
        return new DeletedResponse('contactList.country_removed_blacklist', null, 'Đã xóa quốc gia khỏi blacklist');
    }

    @Post('region/country/whitelist')
    @ApiOperation({ summary: 'Quick Action: Thêm quốc gia vào whitelist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: RegionCountryQuickActionDto })
    async addCountryToWhitelist(
        @Body() dto: RegionCountryQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addCountryToWhitelist(dto.country_code, dto.reason, userId);
        return new CreatedResponse('contactList.country_whitelisted', entry, 'Đã thêm quốc gia vào whitelist');
    }

    @Delete('region/country/whitelist')
    @ApiOperation({ summary: 'Quick Action: Xóa quốc gia khỏi whitelist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: DeleteByValueDto })
    async removeCountryFromWhitelist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeCountryFromWhitelist(dto.value, userId);
        return new DeletedResponse('contactList.country_removed_whitelist', null, 'Đã xóa quốc gia khỏi whitelist');
    }

    @Post('region/city/blacklist')
    @ApiOperation({ summary: 'Quick Action: Thêm tỉnh/thành phố vào blacklist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: RegionCityQuickActionDto })
    async addCityToBlacklist(
        @Body() dto: RegionCityQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addCityToBlacklist(dto.country_code, dto.city_code, dto.reason, userId);
        return new CreatedResponse('contactList.city_blacklisted', entry, 'Đã thêm tỉnh/thành phố vào blacklist');
    }

    @Delete('region/city/blacklist')
    @ApiOperation({ summary: 'Quick Action: Xóa tỉnh/thành phố khỏi blacklist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: RegionCityQuickActionDto })
    async removeCityFromBlacklist(
        @Body() dto: RegionCityQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeCityFromBlacklist(dto.country_code, dto.city_code, userId);
        return new DeletedResponse('contactList.city_removed_blacklist', null, 'Đã xóa tỉnh/thành phố khỏi blacklist');
    }

    @Post('region/city/whitelist')
    @ApiOperation({ summary: 'Quick Action: Thêm tỉnh/thành phố vào whitelist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    @ApiBody({ type: RegionCityQuickActionDto })
    async addCityToWhitelist(
        @Body() dto: RegionCityQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addCityToWhitelist(dto.country_code, dto.city_code, dto.reason, userId);
        return new CreatedResponse('contactList.city_whitelisted', entry, 'Đã thêm tỉnh/thành phố vào whitelist');
    }

    @Delete('region/city/whitelist')
    @ApiOperation({ summary: 'Quick Action: Xóa tỉnh/thành phố khỏi whitelist' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    @ApiBody({ type: RegionCityQuickActionDto })
    async removeCityFromWhitelist(
        @Body() dto: RegionCityQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeCityFromWhitelist(dto.country_code, dto.city_code, userId);
        return new DeletedResponse('contactList.city_removed_whitelist', null, 'Đã xóa tỉnh/thành phố khỏi whitelist');
    }
}
