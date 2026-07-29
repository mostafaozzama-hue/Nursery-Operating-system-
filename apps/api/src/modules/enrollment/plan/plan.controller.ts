import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';
import { PlanResponseDto } from './dto/plan-response.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanService } from './plan.service';

/**
 * No DELETE route - Plan's lifecycle is CRUD + activate/deactivate, not
 * deletion; deactivating (isActive=false) is what blocks new assignments
 * while leaving existing enrollments/history untouched, per
 * domain-model.md's soft-delete cascade policy. Matches the approved
 * Backend Services design's PlanService method set exactly.
 */
@ApiTags('plans')
@ApiCookieAuth()
@Controller('plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a Plan definition' })
  @ApiResponse({ status: 201, type: PlanResponseDto })
  create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List Plans (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(PlanResponseDto)
  findAll(@Query() query: PlanQueryDto) {
    return this.planService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Plan by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a Plan (name, billing cycle, schedule) - not its active/inactive status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(id, dto);
  }

  @Post(':id/activate')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Reactivate a Plan so it can be assigned again' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: PlanResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.setActive(id, true);
  }

  @Post(':id/deactivate')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a Plan - existing enrollments are unaffected, only new assignments are blocked' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: PlanResponseDto })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.setActive(id, false);
  }
}
