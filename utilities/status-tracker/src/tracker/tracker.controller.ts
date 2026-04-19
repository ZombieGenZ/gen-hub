import { Controller, Get, Param, Query } from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Tracker')
@Controller('tracker')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Get('types')
  @ApiOperation({ summary: 'Lấy danh sách các loại service đang được giám sát' })
  async getTypes() {
    return this.trackerService.getTrackerTypes();
  }

  @Get(':type')
  @ApiOperation({ summary: 'Lấy lịch sử trạng thái của service theo loại' })
  @ApiQuery({ name: 'range', enum: ['24h', '1d', '3d', '7d'], required: false })
  async getHistory(
    @Param('type') type: string,
    @Query('range') range: string = '24h',
  ) {
    return this.trackerService.getStatusHistory(type, range);
  }
}
