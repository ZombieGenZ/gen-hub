import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseVisitPurpose } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateAiVisitBookingDto {
  @ApiProperty({
    description: 'ID của kho mà khách hàng muốn đặt lịch tham quan.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: i18nValidationMessage('ai-plugin.validation.warehouse_id_uuid') })
  warehouse_id: string;

  @ApiPropertyOptional({
    description: 'ID tổ chức liên quan nếu lịch tham quan được tạo cho một doanh nghiệp cụ thể.',
    example: '770e8400-e29b-41d4-a716-446655440222',
  })
  @IsOptional()
  @IsUUID('4', { message: i18nValidationMessage('ai-plugin.validation.organization_id_uuid') })
  organization_id?: string;

  @ApiProperty({
    description: 'Tên người đại diện đi tham quan kho.',
    example: 'Trần Minh Khoa',
  })
  @IsString({ message: i18nValidationMessage('ai-plugin.validation.visitor_name_string') })
  visitor_name: string;

  @ApiProperty({
    description: 'Email liên hệ để xác nhận hoặc cập nhật lịch hẹn.',
    example: 'tranminhkhoa@example.com',
  })
  @IsEmail({}, { message: i18nValidationMessage('ai-plugin.validation.visitor_email_invalid') })
  visitor_email: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ của khách tham quan.',
    example: '0911222333',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('ai-plugin.validation.visitor_phone_string') })
  visitor_phone?: string;

  @ApiPropertyOptional({
    description: 'Tên công ty của khách tham quan nếu có.',
    example: 'GEN Logistics',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('ai-plugin.validation.visitor_company_string') })
  visitor_company?: string;

  @ApiPropertyOptional({
    description: 'Chức vụ của khách tham quan trong tổ chức.',
    example: 'Quản lý thu mua',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('ai-plugin.validation.visitor_position_string') })
  visitor_position?: string;

  @ApiProperty({
    description: 'Ngày dự kiến tham quan kho theo định dạng ISO date.',
    example: '2026-03-20',
  })
  @IsDateString({}, { message: i18nValidationMessage('ai-plugin.validation.visit_date_date_string') })
  visit_date: string;

  @ApiProperty({
    description: 'Thời gian bắt đầu tham quan kho.',
    example: '09:00',
  })
  @IsString({ message: i18nValidationMessage('ai-plugin.validation.visit_time_start_string') })
  visit_time_start: string;

  @ApiPropertyOptional({
    description: 'Thời gian kết thúc dự kiến của buổi tham quan.',
    example: '10:30',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('ai-plugin.validation.visit_time_end_string') })
  visit_time_end?: string;

  @ApiPropertyOptional({
    description: 'Mục đích chính của buổi tham quan kho.',
    enum: WarehouseVisitPurpose,
    example: WarehouseVisitPurpose.RENTAL_INQUIRY,
  })
  @IsOptional()
  @IsEnum(WarehouseVisitPurpose, {
    message: i18nValidationMessage('ai-plugin.validation.purpose_enum'),
  })
  purpose?: WarehouseVisitPurpose;

  @ApiPropertyOptional({
    description: 'Thông tin bổ sung về nhu cầu hoặc mục đích tham quan.',
    example: 'Muốn kiểm tra khu vực kho lạnh và quy trình xuất nhập hàng.',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('ai-plugin.validation.purpose_details_string') })
  purpose_details?: string;

  @ApiPropertyOptional({
    description: 'Số lượng người dự kiến tham gia buổi tham quan.',
    default: 1,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('ai-plugin.validation.number_of_visitors_int') })
  @Min(1, { message: i18nValidationMessage('ai-plugin.validation.number_of_visitors_min') })
  number_of_visitors?: number;
}
