import {
  Body,
  Controller,
  Delete,
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
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';
import { PayrollResponseDto } from './dto/payroll-response.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollService } from './payroll.service';

/**
 * OWNER/ADMIN only, for both read and write - payroll is HR-adjacent
 * compensation data, same reasoning as Membership's read boundary, not the
 * Staff-profile precedent (where STAFF gets read access). No STAFF access at
 * all, not even to their own record.
 */
@ApiTags('payroll')
@ApiCookieAuth()
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payroll record for a staff member' })
  @ApiResponse({ status: 201, type: PayrollResponseDto })
  create(@Body() dto: CreatePayrollDto) {
    return this.payrollService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payroll records (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(PayrollResponseDto)
  findAll(@Query() query: PayrollQueryDto) {
    return this.payrollService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payroll record by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: PayrollResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payroll record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: PayrollResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePayrollDto) {
    return this.payrollService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a payroll record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.remove(id);
  }
}
