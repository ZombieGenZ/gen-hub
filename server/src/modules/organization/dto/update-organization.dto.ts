import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { CreateOrganizationDto } from './create-organization.dto';

/**
 * DTO cập nhật Organization
 * Bao gồm các trường Google OAuth cho cấu hình email
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) { }
