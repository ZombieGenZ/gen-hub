import { PartialType } from '@nestjs/swagger';
import { CreateAmenityDto } from './create-amenity.dto';

/**
 * DTO cập nhật Amenity
 */
export class UpdateAmenityDto extends PartialType(CreateAmenityDto) {}
