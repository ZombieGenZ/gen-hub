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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
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

@ApiTags('Contact List (Blacklist/Whitelist)')
@Controller('admin/contact-list')
export class ContactListController {
    constructor(private readonly contactListService: ContactListService) { }

    @Post()
    @ApiOperation({ summary: 'Tạo Contact List entry mới' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async create(
        @Body() dto: CreateContactListDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const entry = await this.contactListService.create(dto, userId, lang);
        return new CreatedResponse('contactList.created', entry, 'Đã tạo entry thành công');
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách Contact List entries' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.list')
    async findAll(@Query() query: QueryContactListDto) {
        const result = await this.contactListService.findAll(query);
        return new GetResponse('contactList.list', result, 'Lấy danh sách thành công');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết Contact List entry' })
    @ApiParam({ name: 'id', description: 'ID entry' })
    @ApiBearerAuth()
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
    @ApiParam({ name: 'id', description: 'ID entry' })
    @ApiBearerAuth()
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
    @ApiParam({ name: 'id', description: 'ID entry' })
    @ApiBearerAuth()
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
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.contactListService.deleteMany(ids, userId, lang);
        return new DeletedResponse('contactList.deletedMany', null, 'Đã xóa các entries thành công');
    }

    @Post('email/blacklist')
    @ApiOperation({ summary: 'Thêm email vào blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addEmailToBlacklist(
        @Body() dto: EmailQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addEmailToBlacklist(dto.email, dto.reason, userId);
        return new CreatedResponse('contactList.email_blacklisted', entry, 'Đã thêm email vào blacklist');
    }

    @Delete('email/blacklist')
    @ApiOperation({ summary: 'Xóa email khỏi blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeEmailFromBlacklist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeEmailFromBlacklist(dto.value, userId);
        return new DeletedResponse('contactList.email_removed_blacklist', null, 'Đã xóa email khỏi blacklist');
    }

    @Post('email/whitelist')
    @ApiOperation({ summary: 'Thêm email vào whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addEmailToWhitelist(
        @Body() dto: EmailQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addEmailToWhitelist(dto.email, dto.reason, userId);
        return new CreatedResponse('contactList.email_whitelisted', entry, 'Đã thêm email vào whitelist');
    }

    @Delete('email/whitelist')
    @ApiOperation({ summary: 'Xóa email khỏi whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeEmailFromWhitelist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeEmailFromWhitelist(dto.value, userId);
        return new DeletedResponse('contactList.email_removed_whitelist', null, 'Đã xóa email khỏi whitelist');
    }

    @Post('domain/blacklist')
    @ApiOperation({ summary: 'Thêm domain vào blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addDomainToBlacklist(
        @Body() dto: DomainQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addDomainToBlacklist(dto.domain, dto.reason, userId);
        return new CreatedResponse('contactList.domain_blacklisted', entry, 'Đã thêm domain vào blacklist');
    }

    @Delete('domain/blacklist')
    @ApiOperation({ summary: 'Xóa domain khỏi blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeDomainFromBlacklist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeDomainFromBlacklist(dto.value, userId);
        return new DeletedResponse('contactList.domain_removed_blacklist', null, 'Đã xóa domain khỏi blacklist');
    }

    @Post('domain/whitelist')
    @ApiOperation({ summary: 'Thêm domain vào whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addDomainToWhitelist(
        @Body() dto: DomainQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addDomainToWhitelist(dto.domain, dto.reason, userId);
        return new CreatedResponse('contactList.domain_whitelisted', entry, 'Đã thêm domain vào whitelist');
    }

    @Delete('domain/whitelist')
    @ApiOperation({ summary: 'Xóa domain khỏi whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeDomainFromWhitelist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeDomainFromWhitelist(dto.value, userId);
        return new DeletedResponse('contactList.domain_removed_whitelist', null, 'Đã xóa domain khỏi whitelist');
    }

    @Post('ip/blacklist')
    @ApiOperation({ summary: 'Thêm IP vào blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addIPToBlacklist(
        @Body() dto: IpQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addIPToBlacklist(dto.ip, dto.reason, userId);
        return new CreatedResponse('contactList.ip_blacklisted', entry, 'Đã thêm IP vào blacklist');
    }

    @Delete('ip/blacklist')
    @ApiOperation({ summary: 'Xóa IP khỏi blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeIPFromBlacklist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeIPFromBlacklist(dto.value, userId);
        return new DeletedResponse('contactList.ip_removed_blacklist', null, 'Đã xóa IP khỏi blacklist');
    }

    @Post('ip/whitelist')
    @ApiOperation({ summary: 'Thêm IP vào whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addIPToWhitelist(
        @Body() dto: IpQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addIPToWhitelist(dto.ip, dto.reason, userId);
        return new CreatedResponse('contactList.ip_whitelisted', entry, 'Đã thêm IP vào whitelist');
    }

    @Delete('ip/whitelist')
    @ApiOperation({ summary: 'Xóa IP khỏi whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeIPFromWhitelist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeIPFromWhitelist(dto.value, userId);
        return new DeletedResponse('contactList.ip_removed_whitelist', null, 'Đã xóa IP khỏi whitelist');
    }

    @Post('region/country/blacklist')
    @ApiOperation({ summary: 'Thêm quốc gia vào blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addCountryToBlacklist(
        @Body() dto: RegionCountryQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addCountryToBlacklist(dto.country_code, dto.reason, userId);
        return new CreatedResponse('contactList.country_blacklisted', entry, 'Đã thêm quốc gia vào blacklist');
    }

    @Delete('region/country/blacklist')
    @ApiOperation({ summary: 'Xóa quốc gia khỏi blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeCountryFromBlacklist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeCountryFromBlacklist(dto.value, userId);
        return new DeletedResponse('contactList.country_removed_blacklist', null, 'Đã xóa quốc gia khỏi blacklist');
    }

    @Post('region/country/whitelist')
    @ApiOperation({ summary: 'Thêm quốc gia vào whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addCountryToWhitelist(
        @Body() dto: RegionCountryQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addCountryToWhitelist(dto.country_code, dto.reason, userId);
        return new CreatedResponse('contactList.country_whitelisted', entry, 'Đã thêm quốc gia vào whitelist');
    }

    @Delete('region/country/whitelist')
    @ApiOperation({ summary: 'Xóa quốc gia khỏi whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeCountryFromWhitelist(
        @Body() dto: DeleteByValueDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeCountryFromWhitelist(dto.value, userId);
        return new DeletedResponse('contactList.country_removed_whitelist', null, 'Đã xóa quốc gia khỏi whitelist');
    }

    @Post('region/city/blacklist')
    @ApiOperation({ summary: 'Thêm tỉnh/thành phố vào blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addCityToBlacklist(
        @Body() dto: RegionCityQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addCityToBlacklist(dto.country_code, dto.city_code, dto.reason, userId);
        return new CreatedResponse('contactList.city_blacklisted', entry, 'Đã thêm tỉnh/thành phố vào blacklist');
    }

    @Delete('region/city/blacklist')
    @ApiOperation({ summary: 'Xóa tỉnh/thành phố khỏi blacklist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeCityFromBlacklist(
        @Body() dto: RegionCityQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeCityFromBlacklist(dto.country_code, dto.city_code, userId);
        return new DeletedResponse('contactList.city_removed_blacklist', null, 'Đã xóa tỉnh/thành phố khỏi blacklist');
    }

    @Post('region/city/whitelist')
    @ApiOperation({ summary: 'Thêm tỉnh/thành phố vào whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.create')
    async addCityToWhitelist(
        @Body() dto: RegionCityQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        const entry = await this.contactListService.addCityToWhitelist(dto.country_code, dto.city_code, dto.reason, userId);
        return new CreatedResponse('contactList.city_whitelisted', entry, 'Đã thêm tỉnh/thành phố vào whitelist');
    }

    @Delete('region/city/whitelist')
    @ApiOperation({ summary: 'Xóa tỉnh/thành phố khỏi whitelist' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-list.delete')
    async removeCityFromWhitelist(
        @Body() dto: RegionCityQuickActionDto,
        @CurrentUser('userId') userId: string,
    ) {
        await this.contactListService.removeCityFromWhitelist(dto.country_code, dto.city_code, userId);
        return new DeletedResponse('contactList.city_removed_whitelist', null, 'Đã xóa tỉnh/thành phố khỏi whitelist');
    }
}
