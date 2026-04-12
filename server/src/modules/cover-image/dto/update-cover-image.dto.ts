import { PartialType } from '@nestjs/swagger';
import { CreateCoverImageDto } from './create-cover-image.dto';

export class UpdateCoverImageDto extends PartialType(CreateCoverImageDto) {}
