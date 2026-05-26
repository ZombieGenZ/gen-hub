import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { WarehouseLegalDocService } from './warehouse-legal-doc.service';
import { UploadLegalDocumentDto, QueryLegalDocumentsDto } from './warehouse-legal-doc.dto';
import type { DocReviewStatus } from '@prisma/client';

@ApiTags('Warehouse Legal Documents')
@ApiBearerAuth()
@Controller('warehouse-legal-docs')
export class WarehouseLegalDocController {
  constructor(private readonly service: WarehouseLegalDocService) {}

  @Post(':warehouseTemplateId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        document_type: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload tài liệu pháp lý cho kho' })
  upload(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Body() dto: UploadLegalDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.upload(warehouseTemplateId, dto.document_type, file);
  }

  @Get(':warehouseTemplateId')
  @ApiOperation({ summary: 'Liệt kê tài liệu pháp lý của kho' })
  list(
    @Param('warehouseTemplateId', ParseUUIDPipe) warehouseTemplateId: string,
    @Query() query: QueryLegalDocumentsDto,
  ) {
    return this.service.list(warehouseTemplateId, query.review_status as DocReviewStatus);
  }

  @Get('download/:documentId')
  @ApiOperation({ summary: 'Lấy signed URL tải xuống tài liệu' })
  getDownloadUrl(@Param('documentId', ParseUUIDPipe) documentId: string) {
    return this.service.getSignedUrl(documentId);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Xóa tài liệu pháp lý' })
  delete(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.delete(documentId, req.user.id);
  }
}
