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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
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
import {
  RequirePermission,
  CurrentUser,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
} from '../../common/responses/success.response';
import {
  buildErrorSchema,
  buildSuccessSchema,
} from '../../common/swagger/master-data-swagger.helper';

const contactListEntrySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    list_type: { type: 'string', example: 'BLACKLIST' },
    match_type: { type: 'string', example: 'EMAIL' },
    value: { type: 'string', example: 'spam@example.com' },
    country_code: { type: 'string', example: 'VN', nullable: true },
    city_code: { type: 'string', example: 'HN', nullable: true },
    reason: { type: 'string', example: 'Spam liên tục', nullable: true },
    notes: {
      type: 'string',
      example: 'Được thêm bởi quản trị viên',
      nullable: true,
    },
    is_active: { type: 'boolean', example: true },
  },
};

const contactListEntryExample = {
  id: '550e8400-e29b-41d4-a716-446655440031',
  list_type: 'BLACKLIST',
  match_type: 'EMAIL',
  value: 'spam@example.com',
  country_code: null,
  city_code: null,
  reason: 'Spam liên tục',
  notes: 'Được thêm bởi quản trị viên',
  is_active: true,
};

const ApiStandardResponse = (options: {
  status: number;
  description: string;
  codeExample: string;
  messageExample: string;
  dataSchema?: Record<string, any>;
  dataExample?: unknown;
}) =>
  ApiResponse({
    status: options.status,
    description: options.description,
    schema: buildSuccessSchema({
      code: options.codeExample,
      message: options.messageExample,
      dataSchema: options.dataSchema ?? { type: 'null', nullable: true },
      dataExample: options.dataExample,
    }),
  });

const ApiStandardErrorResponse = (options: {
  status: number;
  description: string;
  codeExample: string;
  messageExample: string;
}) =>
  ApiResponse({
    status: options.status,
    description: options.description,
    schema: buildErrorSchema({
      code: options.codeExample,
      message: options.messageExample,
    }),
  });

@ApiTags('Contact List (Blacklist/Whitelist)')
@Controller('admin/contact-list')
export class ContactListController {
  constructor(private readonly contactListService: ContactListService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo Contact List entry mới',
    description:
      'Thêm thủ công một entry vào blacklist hoặc whitelist với đầy đủ thông tin match, giá trị, lý do và ghi chú. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: CreateContactListDto,
    description: 'Thông tin entry cần tạo.',
    examples: {
      email_blacklist: {
        summary: 'Thêm email vào blacklist',
        value: {
          list_type: 'BLACKLIST',
          match_type: 'EMAIL',
          value: 'spam@example.com',
          reason: 'Spam liên tục',
          notes: 'Khóa để bảo vệ hệ thống',
        },
      },
      city_whitelist: {
        summary: 'Thêm khu vực vào whitelist',
        value: {
          list_type: 'WHITELIST',
          match_type: 'REGION_CITY',
          value: 'HN',
          country_code: 'VN',
          city_code: 'HN',
          reason: 'Khu vực đối tác chiến lược',
        },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Tạo Contact List entry thành công.',
    codeExample: 'contactList.created',
    messageExample: 'Đã tạo entry thành công',
    dataSchema: contactListEntrySchema,
    dataExample: contactListEntryExample,
  })
  @ApiStandardErrorResponse({
    status: 409,
    description: 'Entry đã tồn tại hoặc dữ liệu tạo mới bị xung đột.',
    codeExample: 'error.contact_list.conflict',
    messageExample: 'Entry đã tồn tại trong danh sách',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async create(
    @Body() dto: CreateContactListDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const entry = await this.contactListService.create(dto, userId, lang);
    return new CreatedResponse(
      'contactList.created',
      entry,
      'Đã tạo entry thành công',
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách Contact List entries',
    description:
      'Trả về danh sách blacklist hoặc whitelist có hỗ trợ phân trang, tìm kiếm và lọc theo loại danh sách, loại match hoặc trạng thái hoạt động. Yêu cầu quyền `contact-list.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi trên mỗi trang.',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu để phân trang.',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm theo giá trị, lý do hoặc ghi chú.',
    example: 'spam',
  })
  @ApiQuery({
    name: 'list_type',
    required: false,
    enum: ['BLACKLIST', 'WHITELIST'],
    description: 'Lọc theo loại danh sách.',
    example: 'BLACKLIST',
  })
  @ApiQuery({
    name: 'match_type',
    required: false,
    enum: [
      'EMAIL',
      'EMAIL_DOMAIN',
      'IP_V4',
      'IP_V6',
      'REGION_COUNTRY',
      'REGION_CITY',
    ],
    description: 'Lọc theo loại match.',
    example: 'EMAIL',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động.',
    example: true,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['EMAIL', 'DOMAIN', 'IP', 'PHONE', 'COUNTRY', 'CITY'],
    description: 'Bộ lọc tương thích giao diện quản trị.',
    example: 'EMAIL',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Lấy danh sách Contact List entry thành công.',
    codeExample: 'contactList.list',
    messageExample: 'Lấy danh sách thành công',
    dataSchema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: contactListEntrySchema },
        total: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        offset: { type: 'number', example: 0 },
      },
    },
    dataExample: {
      items: [contactListEntryExample],
      total: 1,
      limit: 10,
      offset: 0,
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.list')
  async findAll(@Query() query: QueryContactListDto) {
    const result = await this.contactListService.findAll(query);
    return new GetResponse(
      'contactList.list',
      result,
      'Lấy danh sách thành công',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết Contact List entry',
    description:
      'Trả về đầy đủ thông tin của một entry trong blacklist hoặc whitelist theo ID. Yêu cầu quyền `contact-list.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID entry cần xem chi tiết.',
    example: '550e8400-e29b-41d4-a716-446655440031',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Lấy chi tiết Contact List entry thành công.',
    codeExample: 'contactList.read',
    messageExample: 'Lấy chi tiết thành công',
    dataSchema: contactListEntrySchema,
    dataExample: contactListEntryExample,
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Không tìm thấy entry theo ID được cung cấp.',
    codeExample: 'error.contact_list.not_found',
    messageExample: 'Không tìm thấy entry',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.read')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const entry = await this.contactListService.findById(id, lang);
    return new GetResponse(
      'contactList.read',
      entry,
      'Lấy chi tiết thành công',
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật Contact List entry',
    description:
      'Cập nhật một phần hoặc toàn bộ thông tin của entry trong blacklist hoặc whitelist. Yêu cầu quyền `contact-list.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID entry cần cập nhật.',
    example: '550e8400-e29b-41d4-a716-446655440031',
  })
  @ApiBody({
    type: UpdateContactListDto,
    description: 'Thông tin cần cập nhật.',
    examples: {
      change_reason: {
        summary: 'Cập nhật lý do và ghi chú',
        value: {
          reason: 'Spam tái diễn nhiều lần',
          notes: 'Theo dõi thêm 30 ngày',
        },
      },
      deactivate: {
        summary: 'Ngừng kích hoạt entry',
        value: { is_active: false },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Cập nhật Contact List entry thành công.',
    codeExample: 'contactList.updated',
    messageExample: 'Đã cập nhật thành công',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      reason: 'Spam tái diễn nhiều lần',
      notes: 'Theo dõi thêm 30 ngày',
    },
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Không tìm thấy entry cần cập nhật.',
    codeExample: 'error.contact_list.not_found',
    messageExample: 'Không tìm thấy entry',
  })
  @ApiStandardErrorResponse({
    status: 409,
    description: 'Giá trị cập nhật bị trùng với entry khác.',
    codeExample: 'error.contact_list.conflict',
    messageExample: 'Entry đã tồn tại trong danh sách',
  })
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
    return new UpdatedResponse(
      'contactList.updated',
      entry,
      'Đã cập nhật thành công',
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa Contact List entry',
    description:
      'Xóa mềm một entry trong blacklist hoặc whitelist theo ID. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID entry cần xóa.',
    example: '550e8400-e29b-41d4-a716-446655440031',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa Contact List entry thành công.',
    codeExample: 'contactList.deleted',
    messageExample: 'Đã xóa thành công',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Không tìm thấy entry cần xóa.',
    codeExample: 'error.contact_list.not_found',
    messageExample: 'Không tìm thấy entry',
  })
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
    return new DeletedResponse(
      'contactList.deleted',
      null,
      'Đã xóa thành công',
    );
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều Contact List entries',
    description:
      'Xóa mềm nhiều entry cùng lúc bằng danh sách ID. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
      example: {
        ids: [
          '550e8400-e29b-41d4-a716-446655440031',
          '550e8400-e29b-41d4-a716-446655440032',
        ],
      },
    },
    description: 'Danh sách ID entry cần xóa.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa nhiều Contact List entry thành công.',
    codeExample: 'contactList.deletedMany',
    messageExample: 'Đã xóa các entries thành công',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async deleteMany(
    @Body('ids') ids: string[],
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.contactListService.deleteMany(ids, userId, lang);
    return new DeletedResponse(
      'contactList.deletedMany',
      null,
      'Đã xóa các entries thành công',
    );
  }

  @Post('email/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Thêm email vào blacklist',
    description:
      'Tạo nhanh một entry blacklist theo email mà không cần truyền đầy đủ cấu trúc tạo thủ công. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: EmailQuickActionDto,
    description: 'Email cần thêm vào blacklist.',
    examples: {
      email_blacklist: {
        summary: 'Blacklist email',
        value: { email: 'spam@example.com', reason: 'Spam liên tục' },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm email vào blacklist thành công.',
    codeExample: 'contactList.email_blacklisted',
    messageExample: 'Đã thêm email vào blacklist',
    dataSchema: contactListEntrySchema,
    dataExample: contactListEntryExample,
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addEmailToBlacklist(
    @Body() dto: EmailQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addEmailToBlacklist(
      dto.email,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.email_blacklisted',
      entry,
      'Đã thêm email vào blacklist',
    );
  }

  @Delete('email/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Xóa email khỏi blacklist',
    description:
      'Xóa nhanh entry blacklist theo email. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: DeleteByValueDto,
    description: 'Email cần xóa khỏi blacklist.',
    examples: {
      remove_email: {
        summary: 'Xóa email blacklist',
        value: { value: 'spam@example.com' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa email khỏi blacklist thành công.',
    codeExample: 'contactList.email_removed_blacklist',
    messageExample: 'Đã xóa email khỏi blacklist',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeEmailFromBlacklist(
    @Body() dto: DeleteByValueDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeEmailFromBlacklist(dto.value, userId);
    return new DeletedResponse(
      'contactList.email_removed_blacklist',
      null,
      'Đã xóa email khỏi blacklist',
    );
  }

  @Post('email/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Thêm email vào whitelist',
    description:
      'Tạo nhanh một entry whitelist theo email. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: EmailQuickActionDto,
    description: 'Email cần thêm vào whitelist.',
    examples: {
      email_whitelist: {
        summary: 'Whitelist email',
        value: { email: 'vip@example.com', reason: 'Khách hàng ưu tiên' },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm email vào whitelist thành công.',
    codeExample: 'contactList.email_whitelisted',
    messageExample: 'Đã thêm email vào whitelist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      list_type: 'WHITELIST',
      value: 'vip@example.com',
      reason: 'Khách hàng ưu tiên',
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addEmailToWhitelist(
    @Body() dto: EmailQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addEmailToWhitelist(
      dto.email,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.email_whitelisted',
      entry,
      'Đã thêm email vào whitelist',
    );
  }

  @Delete('email/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Xóa email khỏi whitelist',
    description:
      'Xóa nhanh entry whitelist theo email. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: DeleteByValueDto,
    description: 'Email cần xóa khỏi whitelist.',
    examples: {
      remove_email: {
        summary: 'Xóa email whitelist',
        value: { value: 'vip@example.com' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa email khỏi whitelist thành công.',
    codeExample: 'contactList.email_removed_whitelist',
    messageExample: 'Đã xóa email khỏi whitelist',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeEmailFromWhitelist(
    @Body() dto: DeleteByValueDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeEmailFromWhitelist(dto.value, userId);
    return new DeletedResponse(
      'contactList.email_removed_whitelist',
      null,
      'Đã xóa email khỏi whitelist',
    );
  }

  @Post('domain/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Thêm domain vào blacklist',
    description:
      'Tạo nhanh blacklist theo domain email. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: DomainQuickActionDto,
    description: 'Domain cần thêm vào blacklist.',
    examples: {
      domain_blacklist: {
        summary: 'Blacklist domain',
        value: { domain: '@spam.com', reason: 'Domain phát tán thư rác' },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm domain vào blacklist thành công.',
    codeExample: 'contactList.domain_blacklisted',
    messageExample: 'Đã thêm domain vào blacklist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      match_type: 'EMAIL_DOMAIN',
      value: '@spam.com',
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addDomainToBlacklist(
    @Body() dto: DomainQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addDomainToBlacklist(
      dto.domain,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.domain_blacklisted',
      entry,
      'Đã thêm domain vào blacklist',
    );
  }

  @Delete('domain/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Xóa domain khỏi blacklist',
    description:
      'Xóa nhanh blacklist theo domain email. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: DeleteByValueDto,
    description: 'Domain cần xóa khỏi blacklist.',
    examples: {
      remove_domain: {
        summary: 'Xóa domain blacklist',
        value: { value: '@spam.com' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa domain khỏi blacklist thành công.',
    codeExample: 'contactList.domain_removed_blacklist',
    messageExample: 'Đã xóa domain khỏi blacklist',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeDomainFromBlacklist(
    @Body() dto: DeleteByValueDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeDomainFromBlacklist(dto.value, userId);
    return new DeletedResponse(
      'contactList.domain_removed_blacklist',
      null,
      'Đã xóa domain khỏi blacklist',
    );
  }

  @Post('domain/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Thêm domain vào whitelist',
    description:
      'Tạo nhanh whitelist theo domain email. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: DomainQuickActionDto,
    description: 'Domain cần thêm vào whitelist.',
    examples: {
      domain_whitelist: {
        summary: 'Whitelist domain',
        value: { domain: '@partner.com', reason: 'Đối tác tin cậy' },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm domain vào whitelist thành công.',
    codeExample: 'contactList.domain_whitelisted',
    messageExample: 'Đã thêm domain vào whitelist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      list_type: 'WHITELIST',
      match_type: 'EMAIL_DOMAIN',
      value: '@partner.com',
      reason: 'Đối tác tin cậy',
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addDomainToWhitelist(
    @Body() dto: DomainQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addDomainToWhitelist(
      dto.domain,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.domain_whitelisted',
      entry,
      'Đã thêm domain vào whitelist',
    );
  }

  @Delete('domain/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Xóa domain khỏi whitelist',
    description:
      'Xóa nhanh whitelist theo domain email. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: DeleteByValueDto,
    description: 'Domain cần xóa khỏi whitelist.',
    examples: {
      remove_domain: {
        summary: 'Xóa domain whitelist',
        value: { value: '@partner.com' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa domain khỏi whitelist thành công.',
    codeExample: 'contactList.domain_removed_whitelist',
    messageExample: 'Đã xóa domain khỏi whitelist',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeDomainFromWhitelist(
    @Body() dto: DeleteByValueDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeDomainFromWhitelist(dto.value, userId);
    return new DeletedResponse(
      'contactList.domain_removed_whitelist',
      null,
      'Đã xóa domain khỏi whitelist',
    );
  }

  @Post('ip/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Thêm IP vào blacklist',
    description:
      'Tạo nhanh blacklist theo địa chỉ IP. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: IpQuickActionDto,
    description: 'Địa chỉ IP cần thêm vào blacklist.',
    examples: {
      ip_blacklist: {
        summary: 'Blacklist IP',
        value: { ip: '192.168.1.1', reason: 'IP tạo truy cập bất thường' },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm IP vào blacklist thành công.',
    codeExample: 'contactList.ip_blacklisted',
    messageExample: 'Đã thêm IP vào blacklist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      match_type: 'IP_V4',
      value: '192.168.1.1',
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addIPToBlacklist(
    @Body() dto: IpQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addIPToBlacklist(
      dto.ip,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.ip_blacklisted',
      entry,
      'Đã thêm IP vào blacklist',
    );
  }

  @Delete('ip/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Xóa IP khỏi blacklist',
    description:
      'Xóa nhanh blacklist theo địa chỉ IP. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: DeleteByValueDto,
    description: 'Địa chỉ IP cần xóa khỏi blacklist.',
    examples: {
      remove_ip: {
        summary: 'Xóa IP blacklist',
        value: { value: '192.168.1.1' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa IP khỏi blacklist thành công.',
    codeExample: 'contactList.ip_removed_blacklist',
    messageExample: 'Đã xóa IP khỏi blacklist',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeIPFromBlacklist(
    @Body() dto: DeleteByValueDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeIPFromBlacklist(dto.value, userId);
    return new DeletedResponse(
      'contactList.ip_removed_blacklist',
      null,
      'Đã xóa IP khỏi blacklist',
    );
  }

  @Post('ip/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Thêm IP vào whitelist',
    description:
      'Tạo nhanh whitelist theo địa chỉ IP. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: IpQuickActionDto,
    description: 'Địa chỉ IP cần thêm vào whitelist.',
    examples: {
      ip_whitelist: {
        summary: 'Whitelist IP',
        value: { ip: '203.113.10.10', reason: 'IP văn phòng đối tác' },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm IP vào whitelist thành công.',
    codeExample: 'contactList.ip_whitelisted',
    messageExample: 'Đã thêm IP vào whitelist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      list_type: 'WHITELIST',
      match_type: 'IP_V4',
      value: '203.113.10.10',
      reason: 'IP văn phòng đối tác',
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addIPToWhitelist(
    @Body() dto: IpQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addIPToWhitelist(
      dto.ip,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.ip_whitelisted',
      entry,
      'Đã thêm IP vào whitelist',
    );
  }

  @Delete('ip/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Xóa IP khỏi whitelist',
    description:
      'Xóa nhanh whitelist theo địa chỉ IP. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: DeleteByValueDto,
    description: 'Địa chỉ IP cần xóa khỏi whitelist.',
    examples: {
      remove_ip: {
        summary: 'Xóa IP whitelist',
        value: { value: '203.113.10.10' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa IP khỏi whitelist thành công.',
    codeExample: 'contactList.ip_removed_whitelist',
    messageExample: 'Đã xóa IP khỏi whitelist',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeIPFromWhitelist(
    @Body() dto: DeleteByValueDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeIPFromWhitelist(dto.value, userId);
    return new DeletedResponse(
      'contactList.ip_removed_whitelist',
      null,
      'Đã xóa IP khỏi whitelist',
    );
  }

  @Post('region/country/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Thêm quốc gia vào blacklist',
    description:
      'Tạo nhanh blacklist theo mã quốc gia ISO 3166-1 alpha-2. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: RegionCountryQuickActionDto,
    description: 'Quốc gia cần thêm vào blacklist.',
    examples: {
      country_blacklist: {
        summary: 'Blacklist quốc gia',
        value: { country_code: 'CN', reason: 'Tạm khóa theo chính sách' },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm quốc gia vào blacklist thành công.',
    codeExample: 'contactList.country_blacklisted',
    messageExample: 'Đã thêm quốc gia vào blacklist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      match_type: 'REGION_COUNTRY',
      value: 'CN',
      country_code: 'CN',
      city_code: null,
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addCountryToBlacklist(
    @Body() dto: RegionCountryQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addCountryToBlacklist(
      dto.country_code,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.country_blacklisted',
      entry,
      'Đã thêm quốc gia vào blacklist',
    );
  }

  @Delete('region/country/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Xóa quốc gia khỏi blacklist',
    description:
      'Xóa nhanh blacklist theo mã quốc gia. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: DeleteByValueDto,
    description: 'Mã quốc gia cần xóa khỏi blacklist.',
    examples: {
      remove_country: {
        summary: 'Xóa quốc gia blacklist',
        value: { value: 'CN' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa quốc gia khỏi blacklist thành công.',
    codeExample: 'contactList.country_removed_blacklist',
    messageExample: 'Đã xóa quốc gia khỏi blacklist',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeCountryFromBlacklist(
    @Body() dto: DeleteByValueDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeCountryFromBlacklist(dto.value, userId);
    return new DeletedResponse(
      'contactList.country_removed_blacklist',
      null,
      'Đã xóa quốc gia khỏi blacklist',
    );
  }

  @Post('region/country/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Thêm quốc gia vào whitelist',
    description:
      'Tạo nhanh whitelist theo mã quốc gia. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: RegionCountryQuickActionDto,
    description: 'Quốc gia cần thêm vào whitelist.',
    examples: {
      country_whitelist: {
        summary: 'Whitelist quốc gia',
        value: { country_code: 'VN', reason: 'Khu vực được phép ưu tiên' },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm quốc gia vào whitelist thành công.',
    codeExample: 'contactList.country_whitelisted',
    messageExample: 'Đã thêm quốc gia vào whitelist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      list_type: 'WHITELIST',
      match_type: 'REGION_COUNTRY',
      value: 'VN',
      country_code: 'VN',
      city_code: null,
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addCountryToWhitelist(
    @Body() dto: RegionCountryQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addCountryToWhitelist(
      dto.country_code,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.country_whitelisted',
      entry,
      'Đã thêm quốc gia vào whitelist',
    );
  }

  @Delete('region/country/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Xóa quốc gia khỏi whitelist',
    description:
      'Xóa nhanh whitelist theo mã quốc gia. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: DeleteByValueDto,
    description: 'Mã quốc gia cần xóa khỏi whitelist.',
    examples: {
      remove_country: {
        summary: 'Xóa quốc gia whitelist',
        value: { value: 'VN' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa quốc gia khỏi whitelist thành công.',
    codeExample: 'contactList.country_removed_whitelist',
    messageExample: 'Đã xóa quốc gia khỏi whitelist',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeCountryFromWhitelist(
    @Body() dto: DeleteByValueDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeCountryFromWhitelist(dto.value, userId);
    return new DeletedResponse(
      'contactList.country_removed_whitelist',
      null,
      'Đã xóa quốc gia khỏi whitelist',
    );
  }

  @Post('region/city/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Thêm tỉnh/thành phố vào blacklist',
    description:
      'Tạo nhanh blacklist theo cặp quốc gia và mã tỉnh/thành phố. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: RegionCityQuickActionDto,
    description: 'Thông tin khu vực cần thêm vào blacklist.',
    examples: {
      city_blacklist: {
        summary: 'Blacklist khu vực',
        value: {
          country_code: 'VN',
          city_code: 'HN',
          reason: 'Tạm chặn theo chính sách',
        },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm tỉnh/thành phố vào blacklist thành công.',
    codeExample: 'contactList.city_blacklisted',
    messageExample: 'Đã thêm tỉnh/thành phố vào blacklist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      match_type: 'REGION_CITY',
      value: 'HN',
      country_code: 'VN',
      city_code: 'HN',
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addCityToBlacklist(
    @Body() dto: RegionCityQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addCityToBlacklist(
      dto.country_code,
      dto.city_code,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.city_blacklisted',
      entry,
      'Đã thêm tỉnh/thành phố vào blacklist',
    );
  }

  @Delete('region/city/blacklist')
  @ApiOperation({
    summary: 'Quick Action: Xóa tỉnh/thành phố khỏi blacklist',
    description:
      'Xóa nhanh blacklist theo cặp quốc gia và tỉnh/thành phố. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: RegionCityQuickActionDto,
    description: 'Thông tin khu vực cần xóa khỏi blacklist.',
    examples: {
      remove_city: {
        summary: 'Xóa khu vực blacklist',
        value: { country_code: 'VN', city_code: 'HN' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa tỉnh/thành phố khỏi blacklist thành công.',
    codeExample: 'contactList.city_removed_blacklist',
    messageExample: 'Đã xóa tỉnh/thành phố khỏi blacklist',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeCityFromBlacklist(
    @Body() dto: RegionCityQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeCityFromBlacklist(
      dto.country_code,
      dto.city_code,
      userId,
    );
    return new DeletedResponse(
      'contactList.city_removed_blacklist',
      null,
      'Đã xóa tỉnh/thành phố khỏi blacklist',
    );
  }

  @Post('region/city/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Thêm tỉnh/thành phố vào whitelist',
    description:
      'Tạo nhanh whitelist theo cặp quốc gia và tỉnh/thành phố. Yêu cầu quyền `contact-list.create`.',
  })
  @ApiBody({
    type: RegionCityQuickActionDto,
    description: 'Thông tin khu vực cần thêm vào whitelist.',
    examples: {
      city_whitelist: {
        summary: 'Whitelist khu vực',
        value: {
          country_code: 'VN',
          city_code: 'HCM',
          reason: 'Khu vực đối tác vận hành',
        },
      },
    },
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Thêm tỉnh/thành phố vào whitelist thành công.',
    codeExample: 'contactList.city_whitelisted',
    messageExample: 'Đã thêm tỉnh/thành phố vào whitelist',
    dataSchema: contactListEntrySchema,
    dataExample: {
      ...contactListEntryExample,
      list_type: 'WHITELIST',
      match_type: 'REGION_CITY',
      value: 'HCM',
      country_code: 'VN',
      city_code: 'HCM',
      reason: 'Khu vực đối tác vận hành',
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.create')
  async addCityToWhitelist(
    @Body() dto: RegionCityQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    const entry = await this.contactListService.addCityToWhitelist(
      dto.country_code,
      dto.city_code,
      dto.reason,
      userId,
    );
    return new CreatedResponse(
      'contactList.city_whitelisted',
      entry,
      'Đã thêm tỉnh/thành phố vào whitelist',
    );
  }

  @Delete('region/city/whitelist')
  @ApiOperation({
    summary: 'Quick Action: Xóa tỉnh/thành phố khỏi whitelist',
    description:
      'Xóa nhanh whitelist theo cặp quốc gia và tỉnh/thành phố. Yêu cầu quyền `contact-list.delete`.',
  })
  @ApiBody({
    type: RegionCityQuickActionDto,
    description: 'Thông tin khu vực cần xóa khỏi whitelist.',
    examples: {
      remove_city: {
        summary: 'Xóa khu vực whitelist',
        value: { country_code: 'VN', city_code: 'HCM' },
      },
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Xóa tỉnh/thành phố khỏi whitelist thành công.',
    codeExample: 'contactList.city_removed_whitelist',
    messageExample: 'Đã xóa tỉnh/thành phố khỏi whitelist',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-list.delete')
  async removeCityFromWhitelist(
    @Body() dto: RegionCityQuickActionDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.contactListService.removeCityFromWhitelist(
      dto.country_code,
      dto.city_code,
      userId,
    );
    return new DeletedResponse(
      'contactList.city_removed_whitelist',
      null,
      'Đã xóa tỉnh/thành phố khỏi whitelist',
    );
  }
}
