import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { AttachPlanFeeDto } from './dto/create-plan-fee.dto';
import { PlanFeeResponseDto } from './dto/plan-fee-response.dto';
import { PlanFeeService } from './plan-fee.service';

/**
 * No PATCH - the frozen Backend Services design's PlanFeeService interface
 * is attach/detach/findForPlan only, no in-place update. Changing
 * isMandatory for an already-attached Fee is detach then re-attach, a
 * direct consequence of the frozen method set, not an oversight here.
 */
@ApiTags('plan-fees')
@ApiCookieAuth()
@Controller('plans/:planId/fees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanFeeController {
  constructor(private readonly planFeeService: PlanFeeService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Attach a Fee to a Plan, marking it mandatory or optional' })
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiResponse({ status: 201, type: PlanFeeResponseDto })
  attach(@Param('planId', ParseUUIDPipe) planId: string, @Body() dto: AttachPlanFeeDto) {
    return this.planFeeService.attach(planId, dto);
  }

  @Delete(':feeId')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Detach a Fee from a Plan' })
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiParam({ name: 'feeId', format: 'uuid' })
  @ApiResponse({ status: 204 })
  detach(@Param('planId', ParseUUIDPipe) planId: string, @Param('feeId', ParseUUIDPipe) feeId: string) {
    return this.planFeeService.detach(planId, feeId);
  }

  @Get()
  @ApiOperation({ summary: "List a Plan's attached Fees" })
  @ApiParam({ name: 'planId', format: 'uuid' })
  @ApiResponse({ status: 200, type: PlanFeeResponseDto, isArray: true })
  findForPlan(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.planFeeService.findForPlan(planId);
  }
}
