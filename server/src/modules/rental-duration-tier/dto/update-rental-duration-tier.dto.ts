import { PartialType } from '@nestjs/swagger';
import { CreateRentalDurationTierDto } from './create-rental-duration-tier.dto';

/**
 * DTO cập nhật mốc thời gian thuê
 */
export class UpdateRentalDurationTierDto extends PartialType(
  CreateRentalDurationTierDto,
) {}
