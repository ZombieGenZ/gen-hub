import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateConsultationRequestDto } from './create-consultation-request.dto';

export class UpdateConsultationRequestDto extends PartialType(CreateConsultationRequestDto) {
    @ApiPropertyOptional({ enum: ConsultationRequestStatus })
    @IsOptional()
    @IsEnum(ConsultationRequestStatus)
    status?: ConsultationRequestStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    assigned_to?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    staff_notes?: string;
}
