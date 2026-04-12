import { PartialType } from '@nestjs/swagger';
import { CreateAddonTypeDto } from './create-addon-type.dto';

/**
 * DTO cập nhật AddonType
 */
export class UpdateAddonTypeDto extends PartialType(CreateAddonTypeDto) {}
