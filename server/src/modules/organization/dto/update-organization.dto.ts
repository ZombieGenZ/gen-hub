import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';

/**
 * DTO cập nhật Organization
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) { }
