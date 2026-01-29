import { IsString, IsOptional, IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignWarehouseManagerDto {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    warehouse_template_id: string;

    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

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
