import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { CreateFeeDto } from './dto/create-fee.dto';
import { FeeQueryDto } from './dto/fee-query.dto';
import { FeeResponseDto } from './dto/fee-response.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { FeeService } from './fee.service';

/**
 * No DELETE route - Fee's lifecycle is CRUD + activate/deactivate, not
 * deletion; deactivating (isActive=false) is what blocks new assignments
 * while leaving existing PlanFee attachments/ChildFeeAssignments untouched,
 * per domain-model.md's soft-delete cascade policy. Matches the approved
 * Backend Services design's FeeService method set exactly (same shape as
 * PlanController).
 */
@ApiTags('fees')
@ApiCookieAuth()
@Controller('fees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a Fee definition' })
  @ApiResponse({ status: 201, type: FeeResponseDto })
  create(@Body() dto: CreateFeeDto) {
    return this.feeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List Fees (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(FeeResponseDto)
  findAll(@Query() query: FeeQueryDto) {
    return this.feeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Fee by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: FeeResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.feeService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a Fee (name, type, amount) - not its active/inactive status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: FeeResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFeeDto) {
    return this.feeService.update(id, dto);
  }

  @Post(':id/activate')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Reactivate a Fee so it can be assigned again' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: FeeResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.feeService.setActive(id, true);
  }

  @Post(':id/deactivate')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a Fee - existing assignments are unaffected, only new ones are blocked' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: FeeResponseDto })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.feeService.setActive(id, false);
  }
}
