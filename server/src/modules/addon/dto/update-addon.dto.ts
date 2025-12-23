import { PartialType } from '@nestjs/swagger';
import { CreateAddonDto } from './create-addon.dto';

/**
 * DTO cập nhật Addon
 */
export class UpdateAddonDto extends PartialType(CreateAddonDto) { }
