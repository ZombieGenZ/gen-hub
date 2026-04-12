import { PartialType } from '@nestjs/swagger';
import { CreateGlobalNotificationDto } from './create-global-notification.dto';

/**
 * DTO cập nhật GlobalNotification
 */
export class UpdateGlobalNotificationDto extends PartialType(
  CreateGlobalNotificationDto,
) {}
