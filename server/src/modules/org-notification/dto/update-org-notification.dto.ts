import { PartialType } from '@nestjs/swagger';
import { CreateOrgNotificationDto } from './create-org-notification.dto';

/**
 * DTO cập nhật OrganizationNotification
 */
export class UpdateOrgNotificationDto extends PartialType(CreateOrgNotificationDto) { }
