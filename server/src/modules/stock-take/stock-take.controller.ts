import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { StockTakeService } from './stock-take.service';
import {
  CreateStockTakeDto,
  QueryStockTakeDto,
  UpdateStockTakeDetailsDto,
} from './dto';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { OrgPermissionGuard } from '../../common/guards/org-permission.guard';
import { RequireOrgPermission } from '../../common/decorators/require-org-permission.decorator';
import { CurrentActor } from '../../common/decorators/current-actor.decorator';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  CreatedResponse,
  GetResponse,
  UpdatedResponse,
} from '../../common/responses/success.response';
import {
  buildSuccessResponseSchema,
  buildPaginationDataSchema,
} from '../../common/swagger/swagger-response.helper';

const ORG_ID = '550e8400-e29b-41d4-a716-446655440001';
const WAREHOUSE_ID = '550e8400-e29b-41d4-a716-446655440003';
const STOCK_TAKE_ID = '550e8400-e29b-41d4-a716-446655440099';

@ApiTags('Inventory - Kiểm kê kho')
@Controller('organizations/:orgId/inventory/stock-take')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
@ApiBearerAuth()
export class StockTakeController {
  constructor(private readonly stockTakeService: StockTakeService) {}

  @Post()
  @RequireOrgPermission('org.inventory.inbound.create')
  @ApiOperation({
    summary: 'Tạo phiếu kiểm kê mới',
    description:
      'Tạo phiếu kiểm kê mới ở trạng thái DRAFT, snapshot tồn kho hiện tại của kho được chọn.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức',
    example: ORG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 201, description: 'Tạo phiếu kiểm kê thành công' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateStockTakeDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.stockTakeService.create(orgId, dto, actorId);
    return new CreatedResponse(
      'stock-take.create',
      result,
      lang === 'vi' ? 'Tạo phiếu kiểm kê thành công' : 'Stock take created',
    );
  }

  @Get()
  @RequireOrgPermission('org.inventory.inbound.list')
  @ApiOperation({
    summary: 'Danh sách phiếu kiểm kê',
    description:
      'Lấy danh sách phiếu kiểm kê có phân trang, lọc theo kho và trạng thái.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức',
    example: ORG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Danh sách phiếu kiểm kê' })
  @ApiAuthResponses()
  async findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: QueryStockTakeDto,
    @I18nLang() lang: string,
  ) {
    const result = await this.stockTakeService.findAll(orgId, query);
    return new GetResponse(
      'stock-take.list',
      result,
      lang === 'vi' ? 'Lấy danh sách thành công' : 'List retrieved',
    );
  }

  @Get(':id')
  @RequireOrgPermission('org.inventory.inbound.list')
  @ApiOperation({
    summary: 'Chi tiết phiếu kiểm kê',
    description: 'Lấy chi tiết phiếu kiểm kê kèm danh sách dòng sản phẩm.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức',
    example: ORG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'id',
    description: 'ID phiếu kiểm kê',
    example: STOCK_TAKE_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Chi tiết phiếu kiểm kê' })
  @ApiAuthResponses()
  async findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.stockTakeService.findOne(orgId, id);
    return new GetResponse(
      'stock-take.detail',
      result,
      lang === 'vi' ? 'Lấy chi tiết thành công' : 'Detail retrieved',
    );
  }

  @Patch(':id/start')
  @RequireOrgPermission('org.inventory.inbound.create')
  @ApiOperation({
    summary: 'Bắt đầu kiểm kê',
    description: 'Chuyển phiếu từ DRAFT sang IN_PROGRESS.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức',
    example: ORG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'id',
    description: 'ID phiếu kiểm kê',
    example: STOCK_TAKE_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Đã bắt đầu kiểm kê' })
  @ApiAuthResponses()
  async start(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.stockTakeService.start(orgId, id, actorId);
    return new UpdatedResponse(
      'stock-take.start',
      result,
      lang === 'vi' ? 'Đã bắt đầu kiểm kê' : 'Stock take started',
    );
  }

  @Patch(':id/details')
  @RequireOrgPermission('org.inventory.inbound.create')
  @ApiOperation({
    summary: 'Cập nhật số đếm thực tế',
    description:
      'Nhập số lượng đếm thực tế cho các dòng sản phẩm trong phiếu kiểm kê.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức',
    example: ORG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'id',
    description: 'ID phiếu kiểm kê',
    example: STOCK_TAKE_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Cập nhật số đếm thành công' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async updateDetails(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockTakeDetailsDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.stockTakeService.updateDetails(
      orgId,
      id,
      dto,
      actorId,
    );
    return new UpdatedResponse(
      'stock-take.update-details',
      result,
      lang === 'vi' ? 'Cập nhật số đếm thành công' : 'Details updated',
    );
  }

  @Patch(':id/complete')
  @RequireOrgPermission('org.inventory.inbound.create')
  @ApiOperation({
    summary: 'Hoàn tất kiểm kê',
    description:
      'Chuyển phiếu từ IN_PROGRESS sang COMPLETED và tính chênh lệch.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức',
    example: ORG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'id',
    description: 'ID phiếu kiểm kê',
    example: STOCK_TAKE_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Hoàn tất kiểm kê thành công' })
  @ApiAuthResponses()
  async complete(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.stockTakeService.complete(orgId, id, actorId);
    return new UpdatedResponse(
      'stock-take.complete',
      result,
      lang === 'vi' ? 'Hoàn tất kiểm kê thành công' : 'Stock take completed',
    );
  }

  @Patch(':id/adjust')
  @RequireOrgPermission('org.inventory.inbound.create')
  @ApiOperation({
    summary: 'Điều chỉnh tồn kho',
    description:
      'Áp dụng chênh lệch vào tồn kho thực tế và chuyển phiếu sang ADJUSTED.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức',
    example: ORG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'id',
    description: 'ID phiếu kiểm kê',
    example: STOCK_TAKE_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Điều chỉnh tồn kho thành công' })
  @ApiAuthResponses()
  async adjust(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.stockTakeService.adjust(orgId, id, actorId);
    return new UpdatedResponse(
      'stock-take.adjust',
      result,
      lang === 'vi' ? 'Điều chỉnh tồn kho thành công' : 'Inventory adjusted',
    );
  }

  @Patch(':id/cancel')
  @RequireOrgPermission('org.inventory.inbound.create')
  @ApiOperation({
    summary: 'Hủy phiếu kiểm kê',
    description: 'Hủy phiếu kiểm kê.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID tổ chức',
    example: ORG_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'id',
    description: 'ID phiếu kiểm kê',
    example: STOCK_TAKE_ID,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Hủy phiếu kiểm kê thành công' })
  @ApiAuthResponses()
  async cancel(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.stockTakeService.cancel(orgId, id, actorId);
    return new UpdatedResponse(
      'stock-take.cancel',
      result,
      lang === 'vi' ? 'Hủy phiếu kiểm kê thành công' : 'Stock take cancelled',
    );
  }
}
