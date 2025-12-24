import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';

export class DeleteManyDto {
    @ApiProperty({ description: 'Danh sách ID cần xóa', type: [String], example: ['uuid-1', 'uuid-2'] })
    @Transform(({ value }) => Array.isArray(value) ? [...new Set(value)] : value)
    @IsArray({ message: 'Danh sách ID phải là một mảng' })
    @IsNotEmpty({ message: 'Danh sách ID không được để trống' })
    @ArrayMinSize(1, { message: 'Danh sách ID phải có ít nhất 1 phần tử' })
    @IsUUID('4', { each: true, message: 'ID không hợp lệ' })
    ids: string[];
}
