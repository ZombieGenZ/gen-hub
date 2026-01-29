import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWarehouseManagerDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ type: [String], required: false })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    role_ids?: string[];
}
