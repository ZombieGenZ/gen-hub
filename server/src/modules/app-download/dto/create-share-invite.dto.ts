import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateShareInviteDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 5, description: 'Maximum number of downloads allowed. -1 for unlimited.', required: false })
  @IsNumber()
  @IsOptional()
  max_download?: number;

  @ApiProperty({ example: false, description: 'If true, the link never expires.', required: false })
  @IsBoolean()
  @IsOptional()
  is_permanent?: boolean;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Expiration date of the link.', required: false })
  @IsDateString()
  @IsOptional()
  expires_at?: Date;
  
  @ApiProperty({ example: 7, description: 'Expiration in days from now. Used if expires_at is not provided.', required: false })
  @IsNumber()
  @IsOptional()
  expires_in_days?: number;
}
