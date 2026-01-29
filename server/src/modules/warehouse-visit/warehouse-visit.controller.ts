import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, UseGuards } from '@nestjs/common';
import { WarehouseVisitService } from './warehouse-visit.service';
import { CreateWarehouseVisitBookingDto } from './dto/create-warehouse-visit-booking.dto';
import { UpdateWarehouseVisitBookingDto } from './dto/update-warehouse-visit-booking.dto';
import { RescheduleWarehouseVisitBookingDto } from './dto/reschedule-warehouse-visit-booking.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Warehouse Visit Booking')
@Controller('warehouse-visit')
export class WarehouseVisitController {
    constructor(private readonly warehouseVisitService: WarehouseVisitService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new visit booking' })
    // Allow public or protected? Usually protected if user_id is involved.
    // Spec didn't say. I'll make it protected for now, or check if user exists.
    // If external visitor, maybe public endpoint? But usually requires login or API key.
    // I will use JwtAuthGuard but make it optional? 
    // For now strict: must be logged in.
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    create(@Body() dto: CreateWarehouseVisitBookingDto, @Request() req: any) {
        return this.warehouseVisitService.createBooking(dto, req.user?.id);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @RequirePermission('warehouse-visit.view')
    @ApiOperation({ summary: 'Get all visit bookings with pagination' })
    findAll(@Query() query: any) {
        return this.warehouseVisitService.findAllBookings(query);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @RequirePermission('warehouse-visit.view')
    @ApiOperation({ summary: 'Get a visit booking by id' })
    findOne(@Param('id') id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseVisitService.findBookingById(id, lang);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @RequirePermission('warehouse-visit.update')
    @ApiOperation({ summary: 'Update a visit booking' })
    update(@Param('id') id: string, @Body() dto: UpdateWarehouseVisitBookingDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseVisitService.updateBooking(id, dto, req.user.id, lang);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @RequirePermission('warehouse-visit.delete')
    @ApiOperation({ summary: 'Soft delete a visit booking' })
    remove(@Param('id') id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseVisitService.softDeleteBooking(id, req.user.id, lang);
    }

    @Post(':id/reschedule')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @RequirePermission('warehouse-visit.update')
    @ApiOperation({ summary: 'Reschedule a visit booking' })
    reschedule(@Param('id') id: string, @Body() dto: RescheduleWarehouseVisitBookingDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        return this.warehouseVisitService.rescheduleBooking(
            id,
            dto.visit_date,
            dto.visit_time_start,
            dto.visit_time_end,
            req.user.id,
            lang,
            dto.reason
        );
    }
}
