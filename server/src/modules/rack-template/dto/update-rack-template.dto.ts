import { PartialType } from '@nestjs/swagger';
import { CreateRackTemplateDto } from './create-rack-template.dto';

/**
 * DTO cập nhật RackTemplate
 */
export class UpdateRackTemplateDto extends PartialType(CreateRackTemplateDto) { }
