import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyApiKeyDto {
  @ApiProperty({
    example: 'GENHUB-A1B2C3D4E5F6789012345678901234AB',
    description: 'API Key cần verify',
  })
  @IsNotEmpty()
  @IsString()
  api_key: string;
}
