import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, MaxLength, IsBoolean, IsDateString, Min } from 'class-validator';
import { CreateBatchDto } from './create-batch.dto';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateBatchDto extends PartialType(OmitType(CreateBatchDto, ['product_id'] as const)) { }
