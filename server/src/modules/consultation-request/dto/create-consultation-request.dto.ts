import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationRequestSource } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateConsultationRequestDto {
  @ApiProperty({
    description: 'Họ và tên người gửi yêu cầu tư vấn.',
    example: 'Nguyễn Thị Lan',
  })
  @IsString({
    message: i18nValidationMessage('consultation-request.validation.name_string'),
  })
  name: string;

  @ApiProperty({
    description: 'Email liên hệ để nhân viên phản hồi yêu cầu tư vấn.',
    example: 'lan.nguyen@example.com',
  })
  @IsEmail(
    {},
    { message: i18nValidationMessage('consultation-request.validation.email_invalid') },
  )
  email: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ của khách hàng.',
    example: '0909888777',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('consultation-request.validation.phone_string'),
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Tên doanh nghiệp của người gửi yêu cầu.',
    example: 'ABC Supply Chain',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('consultation-request.validation.company_string'),
  })
  company?: string;

  @ApiPropertyOptional({
    description: 'Chức vụ của người liên hệ.',
    example: 'Trưởng phòng kho vận',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('consultation-request.validation.position_string'),
  })
  position?: string;

  @ApiProperty({
    description: 'Chủ đề chính của nhu cầu tư vấn.',
    example: 'Tư vấn thuê kho lạnh',
  })
  @IsString({
    message: i18nValidationMessage('consultation-request.validation.subject_string'),
  })
  subject: string;

  @ApiProperty({
    description: 'Nội dung mô tả chi tiết nhu cầu của khách hàng.',
    example: 'Cần thuê kho lạnh khoảng 200 m2 tại Long An trong quý 2.',
  })
  @IsString({
    message: i18nValidationMessage('consultation-request.validation.message_string'),
  })
  message: string;

  @ApiPropertyOptional({
    description: 'ID mẫu kho hoặc kho đang được khách hàng quan tâm.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage(
      'consultation-request.validation.warehouse_template_id_uuid',
    ),
  })
  warehouse_template_id?: string;

  @ApiPropertyOptional({
    description: 'Nguồn phát sinh yêu cầu tư vấn.',
    enum: ConsultationRequestSource,
    default: ConsultationRequestSource.WEB_FORM,
    example: ConsultationRequestSource.WEB_FORM,
  })
  @IsOptional()
  @IsEnum(ConsultationRequestSource, {
    message: i18nValidationMessage('consultation-request.validation.source_enum'),
  })
  source?: ConsultationRequestSource;
}
