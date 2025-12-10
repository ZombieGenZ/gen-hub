import { PartialType } from '@nestjs/swagger';
import { CreateWarehouseTemplateDto } from './create-warehouse-template.dto';

/**
 * DTO cập nhật WarehouseTemplate (partial of create)
 */
export class UpdateWarehouseTemplateDto extends PartialType(CreateWarehouseTemplateDto) { }
