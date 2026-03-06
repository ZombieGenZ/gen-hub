import { PartialType } from '@nestjs/swagger';
import { CreateAvatarImageDto } from './create-avatar-image.dto';

export class UpdateAvatarImageDto extends PartialType(CreateAvatarImageDto) {}
