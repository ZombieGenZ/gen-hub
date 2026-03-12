import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationRequestSource } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConsultationRequestDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    company?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    position?: string;

    @ApiProperty()
    @IsString()
    subject: string;

    @ApiProperty()
    @IsString()
    message: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    warehouse_template_id?: string;

    @ApiPropertyOptional({ enum: ConsultationRequestSource, default: ConsultationRequestSource.WEB_FORM })
    @IsOptional()
    @IsEnum(ConsultationRequestSource)
    source?: ConsultationRequestSource;
}
