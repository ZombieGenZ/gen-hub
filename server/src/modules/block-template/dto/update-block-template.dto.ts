import { PartialType } from '@nestjs/mapped-types';
import { CreateBlockTemplateDto } from './create-block-template.dto';

/**
 * DTO cập nhật BlockTemplate
 */
export class UpdateBlockTemplateDto extends PartialType(CreateBlockTemplateDto) { }
