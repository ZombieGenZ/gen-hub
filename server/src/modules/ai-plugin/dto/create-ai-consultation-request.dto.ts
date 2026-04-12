import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateAiConsultationRequestDto {
  @ApiProperty({
    description: 'Họ và tên khách hàng cần GEN-HUB liên hệ tư vấn.',
    example: 'Nguyễn Văn An',
  })
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.name_string'),
  })
  name: string;

  @ApiProperty({
    description: 'Địa chỉ email để đội ngũ GEN-HUB phản hồi yêu cầu tư vấn.',
    example: 'nguyenvanan@example.com',
  })
  @IsEmail(
    {},
    { message: i18nValidationMessage('ai-plugin.validation.email_invalid') },
  )
  email: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ của khách hàng nếu có.',
    example: '0909123456',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.phone_string'),
  })
  phone?: string;

  @ApiProperty({
    description: 'Chủ đề chính mà khách hàng muốn được tư vấn.',
    example: 'Tư vấn thuê kho tại Bình Dương',
  })
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.subject_string'),
  })
  subject: string;

  @ApiProperty({
    description: 'Mô tả chi tiết nhu cầu để nhân viên tư vấn nắm bối cảnh.',
    example: 'Cần tìm kho khoảng 500 m2, ưu tiên gần khu công nghiệp VSIP.',
  })
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.message_string'),
  })
  message: string;

  @ApiPropertyOptional({
    description:
      'ID kho mà khách đang quan tâm nếu cuộc hội thoại đã xác định được kho cụ thể.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('ai-plugin.validation.warehouse_id_uuid'),
  })
  warehouse_id?: string;

  @ApiPropertyOptional({
    description: 'Tên công ty của khách hàng nếu có.',
    example: 'Công ty TNHH ABC Logistics',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.company_string'),
  })
  company?: string;

  @ApiPropertyOptional({
    description: 'Chức vụ của người liên hệ tại doanh nghiệp.',
    example: 'Trưởng phòng vận hành',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.position_string'),
  })
  position?: string;
}
