import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { DiscountQueryDto } from './dto/discount-query.dto';
import { DiscountResponseDto } from './dto/discount-response.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountService } from './discount.service';

/**
 * No DELETE route - Discount's lifecycle is CRUD + activate/deactivate, not
 * deletion; deactivating (isActive=false) is what blocks new
 * ChildDiscountAssignments while leaving existing ones untouched, per
 * domain-model.md's soft-delete cascade policy. Matches the approved
 * Backend Services design's DiscountService method set exactly (same shape
 * as PlanController/FeeController).
 */
@ApiTags('discounts')
@ApiCookieAuth()
@Controller('discounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a Discount definition' })
  @ApiResponse({ status: 201, type: DiscountResponseDto })
  create(@Body() dto: CreateDiscountDto) {
    return this.discountService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List Discounts (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(DiscountResponseDto)
  findAll(@Query() query: DiscountQueryDto) {
    return this.discountService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Discount by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: DiscountResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a Discount (name, type, amount, stackable, scope) - not its active/inactive status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: DiscountResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountService.update(id, dto);
  }

  @Post(':id/activate')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Reactivate a Discount so it can be assigned again' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: DiscountResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountService.setActive(id, true);
  }

  @Post(':id/deactivate')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a Discount - existing assignments are unaffected, only new ones are blocked' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: DiscountResponseDto })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountService.setActive(id, false);
  }
}
