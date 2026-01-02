import { PickType } from '@nestjs/swagger';

import { CreateOrganizationDto } from './create-organization.dto';

/**
 * DTO cập nhật Organization
 * Chỉ cho phép cập nhật trạng thái và thông tin Google OAuth
 */
export class UpdateOrganizationDto extends PickType(CreateOrganizationDto, [
    'is_active',
    'is_using_google_email',
    'google_client_id',
    'google_client_secret',
    'google_refresh_token',
    'email_primary_address',
    'gmail_pubsub_topic',
    'gmail_pubsub_subscription',
    'gmail_webhook_secret',
] as const) { }
