import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateShareInviteDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email người nhận lời mời tải ứng dụng. Email này sẽ nhận được link download có token duy nhất.'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 5,
    description: 'Số lượt tải xuống tối đa cho phép. Đặt -1 để không giới hạn số lần tải. Mặc định là -1 (không giới hạn).',
    required: false,
    default: -1
  })
  @IsNumber()
  @IsOptional()
  max_download?: number;

  @ApiProperty({
    example: false,
    description: 'Nếu true, link tải sẽ không bao giờ hết hạn. Nếu false, link sẽ hết hạn theo expires_at hoặc expires_in_days. Mặc định là false.',
    required: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  is_permanent?: boolean;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'Ngày giờ hết hạn của link (ISO 8601 format). Nếu cung cấp expires_at, expires_in_days sẽ bị bỏ qua. Chỉ áp dụng khi is_permanent = false.',
    required: false
  })
  @IsDateString()
  @IsOptional()
  expires_at?: Date;

  @ApiProperty({
    example: 7,
    description: 'Số ngày hết hạn tính từ thời điểm tạo. Chỉ được sử dụng nếu expires_at không được cung cấp. Mặc định là 7 ngày. Chỉ áp dụng khi is_permanent = false.',
    required: false,
    default: 7
  })
  @IsNumber()
  @IsOptional()
  expires_in_days?: number;
}
