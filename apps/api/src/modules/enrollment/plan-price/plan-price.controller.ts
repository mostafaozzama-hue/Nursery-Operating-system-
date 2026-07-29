import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { PlanPriceQueryDto } from './dto/plan-price-query.dto';
import { PlanPriceResponseDto } from './dto/plan-price-response.dto';
import { SetPlanPriceDto } from './dto/set-plan-price.dto';
import { PlanPriceService } from './plan-price.service';

/**
 * No PATCH/DELETE - PlanPrice is historized only (setPrice closes the
 * current open-ended row and opens a new one); there is no in-place edit
 * or removal, matching the approved Backend Services design exactly.
 */
@ApiTags('plan-prices')
@ApiCookieAuth()
@Controller('plans/:planId/prices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanPriceController {
  constructor(private readonly planPriceService: PlanPriceService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Set a new price for a Plan, closing the current price period' })
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiResponse({ status: 201, type: PlanPriceResponseDto })
  setPrice(@Param('planId', ParseUUIDPipe) planId: string, @Body() dto: SetPlanPriceDto) {
    return this.planPriceService.setPrice(planId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List price history for a Plan (paginated, sortable)' })
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiPaginatedResponse(PlanPriceResponseDto)
  findHistory(@Param('planId', ParseUUIDPipe) planId: string, @Query() query: PlanPriceQueryDto) {
    return this.planPriceService.findHistory(planId, query);
  }
}
