import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/**
 * DTO cập nhật Category
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
