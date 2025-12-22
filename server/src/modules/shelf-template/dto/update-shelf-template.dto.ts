import { PartialType } from '@nestjs/mapped-types';
import { CreateShelfTemplateDto } from './create-shelf-template.dto';

/**
 * DTO cập nhật ShelfTemplate
 */
export class UpdateShelfTemplateDto extends PartialType(CreateShelfTemplateDto) { }
