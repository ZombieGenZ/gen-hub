import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WarehouseTrustService } from './warehouse-trust.service';
import { ReviewLegalDocumentDto } from '../warehouse-legal-doc/warehouse-legal-doc.dto';

@ApiTags('Warehouse Trust & Verification')
@ApiBearerAuth()
@Controller('admin/warehouse-trust')
export class WarehouseTrustController {
  constructor(private readonly service: WarehouseTrustService) {}

  @Get('pending-documents')
  @ApiOperation({ summary: 'Liệt kê tài liệu chờ Admin duyệt' })
  @ApiQuery({ name: 'review_status', required: false })
  listPending(@Query('review_status') reviewStatus?: string) {
    return this.service.listPendingDocuments(reviewStatus);
  }

  @Get('profile/:warehouseTemplateId')
  @ApiOperation({ summary: 'Lấy trust profile của kho' })
  getTrustProfile(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
  ) {
    return this.service.getTrustProfile(warehouseTemplateId);
  }

  @Patch('documents/:documentId/review')
  @ApiOperation({ summary: 'Admin duyệt / từ chối tài liệu pháp lý' })
  review(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ReviewLegalDocumentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.reviewDocument(
      documentId,
      req.user.id,
      dto.status,
      dto.review_note,
    );
  }

  @Patch('recompute/:warehouseTemplateId')
  @ApiOperation({ summary: 'Tính lại trust score thủ công' })
  recompute(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
  ) {
    return this.service.recomputeTrustScore(warehouseTemplateId);
  }
}
