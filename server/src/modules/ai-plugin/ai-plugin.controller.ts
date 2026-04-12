import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { ApiValidationErrorResponse, Public } from '../../common/decorators';
import {
  CreatedResponse,
  GetResponse,
} from '../../common/responses/success.response';
import { AiPluginService } from './ai-plugin.service';
import {
  CheckAvailabilityDto,
  CreateAiConsultationRequestDto,
  CreateAiVisitBookingDto,
  GetWarehousePricingDto,
} from './dto';
import { AiPluginApiKeyGuard } from './guards';

@ApiTags('AI Plugin')
@ApiHeader({
  name: 'X-API-Key',
  description:
    'API key sử dụng bởi nền tảng AI để gọi các endpoint công khai của hệ thống.',
  required: true,
  example: 'AI-PLUGIN-KEY-123456',
})
@Controller('ai-plugin')
@UseGuards(AiPluginApiKeyGuard)
@Public()
export class AiPluginController {
  constructor(private readonly service: AiPluginService) {}

  @Get('warehouse-pricing')
  @ApiOperation({
    summary: 'Lấy danh sách kho và giá thuê cho AI tư vấn',
    description:
      'Trả về danh sách kho phù hợp theo từ khóa, khu vực, diện tích, ngân sách và loại kho. AI nên dùng endpoint này trước khi đề xuất kho hoặc báo giá sơ bộ cho khách hàng.',
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm theo tên kho, địa chỉ hoặc nhu cầu chung.',
    example: 'kho lạnh Bình Dương',
  })
  @ApiQuery({
    name: 'province_name',
    required: false,
    type: String,
    description: 'Tên tỉnh hoặc thành phố cần tìm kho.',
    example: 'Hồ Chí Minh',
  })
  @ApiQuery({
    name: 'province_code',
    required: false,
    type: String,
    description:
      'Mã tỉnh hoặc thành phố nếu nền tảng AI đã xác định được từ ngữ cảnh.',
    example: '79',
  })
  @ApiQuery({
    name: 'min_price',
    required: false,
    type: Number,
    description: 'Ngân sách tối thiểu theo VNĐ một tháng.',
    example: 10000000,
  })
  @ApiQuery({
    name: 'max_price',
    required: false,
    type: Number,
    description: 'Ngân sách tối đa theo VNĐ một tháng.',
    example: 30000000,
  })
  @ApiQuery({
    name: 'min_area',
    required: false,
    type: Number,
    description: 'Diện tích tối thiểu theo mét vuông.',
    example: 200,
  })
  @ApiQuery({
    name: 'max_area',
    required: false,
    type: Number,
    description: 'Diện tích tối đa theo mét vuông.',
    example: 800,
  })
  @ApiQuery({
    name: 'is_cold_storage',
    required: false,
    type: Boolean,
    description: 'Lọc kho lạnh.',
    example: false,
  })
  @ApiQuery({
    name: 'is_shared_warehouse',
    required: false,
    type: Boolean,
    description: 'Lọc kho chia sẻ hoặc thuê theo slot.',
    example: true,
  })
  @ApiQuery({
    name: 'warehouse_id',
    required: false,
    type: String,
    description:
      'ID kho cụ thể nếu AI chỉ cần lấy thông tin của một kho duy nhất.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng kho tối đa trả về cho AI.',
    example: 3,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin giá kho thành công.',
    schema: {
      example: {
        code: 'ai-plugin.warehouse_pricing_fetched',
        message: 'Lấy thông tin giá kho thành công',
        success: true,
        data: [],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy kho phù hợp với điều kiện tìm kiếm.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Không tìm thấy kho',
        error: 'Not Found',
      },
    },
  })
  @ApiValidationErrorResponse()
  async getWarehousePricing(@Query() dto: GetWarehousePricingDto) {
    const data = await this.service.getWarehousePricing(dto);
    return new GetResponse('ai-plugin.warehouse_pricing_fetched', data);
  }

  @Get('check-availability')
  @ApiOperation({
    summary: 'Kiểm tra tình trạng còn chỗ của kho',
    description:
      'Dùng để xác nhận kho hoặc row cụ thể còn khả dụng hay không trước khi AI tư vấn bước tiếp theo hoặc đề nghị đặt lịch tham quan.',
  })
  @ApiQuery({
    name: 'warehouse_id',
    required: true,
    type: String,
    description: 'ID kho cần kiểm tra.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'row_id',
    required: false,
    type: String,
    description: 'ID row hoặc vị trí cụ thể trong kho chia sẻ.',
    example: '660e8400-e29b-41d4-a716-446655440111',
  })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra tình trạng kho thành công.',
    schema: {
      example: {
        code: 'ai-plugin.availability_checked',
        message: 'Kiểm tra tình trạng thành công',
        success: true,
        data: {
          warehouse_id: '550e8400-e29b-41d4-a716-446655440000',
          available: true,
        },
      },
    },
  })
  @ApiValidationErrorResponse()
  async checkAvailability(
    @Query() dto: CheckAvailabilityDto,
    @I18nLang() lang: string,
  ) {
    const data = await this.service.checkAvailability(dto, lang);
    return new GetResponse('ai-plugin.availability_checked', data);
  }

  @Get('rental-contract-terms')
  @ApiOperation({
    summary: 'Lấy điều khoản hợp đồng thuê kho',
    description:
      'Trả về nội dung điều khoản hợp đồng tiêu chuẩn để AI giải đáp các câu hỏi liên quan đến quyền, nghĩa vụ và điều kiện thuê kho.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy điều khoản hợp đồng thành công.',
    schema: {
      example: {
        code: 'ai-plugin.terms_fetched',
        message: 'Lấy điều khoản hợp đồng thành công',
        success: true,
        data: {
          content: 'Nội dung điều khoản hợp đồng...',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tài liệu điều khoản hợp đồng.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Không tìm thấy file điều khoản hợp đồng',
        error: 'Not Found',
      },
    },
  })
  async getRentalContractTerms(@I18nLang() lang: string) {
    const data = await this.service.getRentalContractTerms(lang);
    return new GetResponse('ai-plugin.terms_fetched', data);
  }

  @Get('faq')
  @ApiOperation({
    summary: 'Lấy danh sách câu hỏi thường gặp',
    description:
      'Cung cấp danh sách FAQ tiêu chuẩn để AI dùng khi giải đáp các câu hỏi phổ biến về dịch vụ GEN-HUB.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy FAQ thành công.',
    schema: {
      example: {
        code: 'ai-plugin.faq_fetched',
        message: 'Lấy FAQ thành công',
        success: true,
        data: [],
      },
    },
  })
  async getFaq() {
    const data = await this.service.getFaq();
    return new GetResponse('ai-plugin.faq_fetched', data);
  }

  @Post('consultation-request')
  @ApiOperation({
    summary: 'Tạo yêu cầu tư vấn từ nền tảng AI',
    description:
      'Tạo yêu cầu để nhân viên GEN-HUB liên hệ lại với khách hàng. AI chỉ nên gọi endpoint này sau khi đã xác nhận đủ thông tin tối thiểu gồm họ tên, email, chủ đề và nội dung nhu cầu.',
  })
  @ApiBody({
    type: CreateAiConsultationRequestDto,
    description:
      'Thông tin khách hàng và nhu cầu tư vấn được AI thu thập từ cuộc hội thoại.',
    examples: {
      default: {
        summary: 'Yêu cầu tư vấn thuê kho',
        value: {
          name: 'Nguyễn Văn An',
          email: 'nguyenvanan@example.com',
          phone: '0909123456',
          subject: 'Tư vấn thuê kho tại Bình Dương',
          message:
            'Cần tìm kho khoảng 500 m2, ưu tiên gần khu công nghiệp VSIP.',
          warehouse_id: '550e8400-e29b-41d4-a716-446655440000',
          company: 'ABC Logistics',
          position: 'Trưởng phòng vận hành',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo yêu cầu tư vấn thành công.',
    schema: {
      example: {
        code: 'ai-plugin.consultation_created',
        message: 'Tạo yêu cầu tư vấn thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          code: 'CR-1741779000000-123',
        },
      },
    },
  })
  @ApiValidationErrorResponse()
  async createConsultationRequest(@Body() dto: CreateAiConsultationRequestDto) {
    const data = await this.service.createConsultationRequest(dto);
    return new CreatedResponse('ai-plugin.consultation_created', data);
  }

  @Post('visit-booking')
  @ApiOperation({
    summary: 'Tạo lịch tham quan kho từ nền tảng AI',
    description:
      'Tạo lịch hẹn tham quan kho sau khi AI đã xác nhận lại kho quan tâm, người liên hệ, thời gian tham quan và các thông tin bắt buộc khác.',
  })
  @ApiBody({
    type: CreateAiVisitBookingDto,
    description: 'Thông tin lịch tham quan kho do AI tổng hợp từ khách hàng.',
    examples: {
      default: {
        summary: 'Đặt lịch tham quan kho',
        value: {
          warehouse_id: '550e8400-e29b-41d4-a716-446655440000',
          organization_id: '770e8400-e29b-41d4-a716-446655440222',
          visitor_name: 'Trần Minh Khoa',
          visitor_email: 'tranminhkhoa@example.com',
          visitor_phone: '0911222333',
          visitor_company: 'GEN Logistics',
          visitor_position: 'Quản lý thu mua',
          visit_date: '2026-03-20',
          visit_time_start: '09:00',
          visit_time_end: '10:30',
          purpose: 'RENTAL_INQUIRY',
          purpose_details:
            'Muốn kiểm tra khu vực kho lạnh và quy trình xuất nhập hàng.',
          number_of_visitors: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo lịch tham quan kho thành công.',
    schema: {
      example: {
        code: 'ai-plugin.visit_booking_created',
        message: 'Tạo lịch tham quan kho thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          code: 'VISIT-1741779000000-123',
          status: 'PENDING',
        },
      },
    },
  })
  @ApiValidationErrorResponse()
  async createVisitBooking(@Body() dto: CreateAiVisitBookingDto) {
    const data = await this.service.createVisitBooking(dto);
    return new CreatedResponse('ai-plugin.visit_booking_created', data);
  }
}
