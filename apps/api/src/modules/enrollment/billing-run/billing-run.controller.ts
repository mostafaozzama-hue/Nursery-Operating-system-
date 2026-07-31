import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { BillingRunService } from './billing-run.service';
import { BillingRunQueryDto } from './dto/billing-run-query.dto';
import { BillingRunResponseDto } from './dto/billing-run-response.dto';
import { CreateBillingRunDto } from './dto/create-billing-run.dto';

/**
 * OWNER/ADMIN for both write and read (§9's table) - class-level @Roles,
 * the same precedented pattern as PayrollController/WaiverController, not
 * a new convention. POST triggers generateForPeriod - the same seam a
 * future scheduler/queue would call instead of a human (§11), nothing
 * duplicated.
 */
@ApiTags('billing-runs')
@ApiCookieAuth()
@Controller('billing-runs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class BillingRunController {
  constructor(private readonly billingRunService: BillingRunService) {}

  @Post()
  @ApiOperation({ summary: 'Trigger invoice generation for a tenant + period (idempotent)' })
  @ApiResponse({ status: 201, type: BillingRunResponseDto })
  generate(@Body() dto: CreateBillingRunDto) {
    return this.billingRunService.generateForPeriod(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List BillingRun history' })
  @ApiPaginatedResponse(BillingRunResponseDto)
  findHistory(@Query() query: BillingRunQueryDto) {
    return this.billingRunService.findHistory(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a BillingRun by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: BillingRunResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingRunService.findOne(id);
  }
}
