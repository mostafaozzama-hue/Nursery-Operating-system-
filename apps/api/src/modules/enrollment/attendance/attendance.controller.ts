import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { MarkAbsentDto } from './dto/mark-absent.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

/**
 * No DELETE route - Attendance is historical data, same reasoning as
 * Enrollment. Check-in/check-out/mark-absent are the day-to-day operations
 * front-line STAFF perform; PATCH (correcting a recorded time or classroom)
 * is reserved for OWNER/ADMIN.
 */
@ApiTags('attendance')
@ApiCookieAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Check in a child for today' })
  @ApiResponse({ status: 201, type: AttendanceResponseDto })
  checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @Post(':id/check-out')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Check out a child' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: AttendanceResponseDto })
  @HttpCode(HttpStatus.OK)
  checkOut(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(id, dto);
  }

  @Post('absent')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Record a planned/explained absence for today' })
  @ApiResponse({ status: 201, type: AttendanceResponseDto })
  markAbsent(@Body() dto: MarkAbsentDto) {
    return this.attendanceService.markAbsent(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List attendance records (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(AttendanceResponseDto)
  findAll(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an attendance record by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: AttendanceResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Correct a recorded time or classroom (not a new check-in/out)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: AttendanceResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.update(id, dto);
  }
}
