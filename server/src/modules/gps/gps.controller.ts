import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GpsService } from './gps.service';
import { CreateGpsSessionDto } from './dto/create-gps-session.dto';
import { PostLocationDto } from './dto/post-location.dto';

@ApiTags('GPS Tracking')
@Controller()
export class GpsController {
  constructor(private readonly service: GpsService) {}

  /**
   * Staff tạo phiên GPS khi lập phiếu nhập/xuất
   * Trả về link /track/[token] để gửi cho tài xế
   */
  @Post('warehouse-manager/vehicle-log/gps-session')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tạo phiên GPS tracking cho tài xế' })
  createSession(
    @Body() dto: CreateGpsSessionDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.createSession(dto, req.user.id);
  }

  /**
   * Public — trang /track/[token] gọi để lấy thông tin kho & trạng thái session
   * Không cần đăng nhập
   */
  @Get('gps/session/:token')
  @ApiOperation({ summary: 'Lấy thông tin phiên GPS (public)' })
  getSessionInfo(@Param('token') token: string) {
    return this.service.getSessionInfo(token);
  }

  /**
   * Public — browser tài xế POST vị trí mỗi 30 giây
   * Không cần đăng nhập — xác thực qua token trong body
   */
  @Post('gps/location')
  @ApiOperation({ summary: 'Gửi vị trí GPS từ browser tài xế (public)' })
  postLocation(@Body() dto: PostLocationDto) {
    return this.service.postLocation(dto);
  }

  /**
   * Staff xem danh sách phiên GPS đang hoạt động tại kho
   */
  @Get('warehouse-manager/gps/active-sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Danh sách phiên GPS đang active tại kho' })
  @ApiQuery({ name: 'warehouse_template_id', required: true })
  listActiveSessions(
    @Query('warehouse_template_id') warehouseTemplateId: string,
  ) {
    return this.service.listActiveSessions(warehouseTemplateId);
  }
}
