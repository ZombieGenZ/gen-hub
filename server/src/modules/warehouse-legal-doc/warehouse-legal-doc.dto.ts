import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseLegalDocType, DocReviewStatus } from '@prisma/client';

export class UploadLegalDocumentDto {
  @ApiProperty({ enum: WarehouseLegalDocType })
  @IsEnum(WarehouseLegalDocType)
  document_type: WarehouseLegalDocType;
}

export class ReviewLegalDocumentDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'NEEDS_RESUBMIT'] })
  @IsEnum(['APPROVED', 'REJECTED', 'NEEDS_RESUBMIT'])
  status: 'APPROVED' | 'REJECTED' | 'NEEDS_RESUBMIT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  review_note?: string;
}

export class QueryLegalDocumentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouse_template_id?: string;

  @ApiPropertyOptional({ enum: DocReviewStatus })
  @IsOptional()
  @IsEnum(DocReviewStatus)
  review_status?: DocReviewStatus;
}
