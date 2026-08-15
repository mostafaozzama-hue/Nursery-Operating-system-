import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { SetSiblingDiscountTierDto } from './dto/set-sibling-discount-tier.dto';
import { SiblingDiscountTierQueryDto } from './dto/sibling-discount-tier-query.dto';
import { SiblingDiscountTierResponseDto } from './dto/sibling-discount-tier-response.dto';
import { SiblingDiscountTierService } from './sibling-discount-tier.service';

/**
 * No :id detail route, no PATCH/DELETE - SiblingDiscountTier is historized
 * only (setTier closes the current open-ended row for a threshold and
 * opens a new one); there is no in-place edit or removal, matching
 * PlanPriceController's identical shape. findEffective has no route at all
 * - composable-only, called by PricingEngineService later, same as
 * PlanPriceService.findEffective.
 */
@ApiTags('sibling-discount-tiers')
@ApiCookieAuth()
@Controller('sibling-discount-tiers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SiblingDiscountTierController {
  constructor(private readonly siblingDiscountTierService: SiblingDiscountTierService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Set a new sibling-discount tier for a threshold, closing the current tier period' })
  @ApiResponse({ status: 201, type: SiblingDiscountTierResponseDto })
  setTier(@Body() dto: SetSiblingDiscountTierDto) {
    return this.siblingDiscountTierService.setTier(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sibling-discount tier history (paginated, sortable)' })
  @ApiPaginatedResponse(SiblingDiscountTierResponseDto)
  findAll(@Query() query: SiblingDiscountTierQueryDto) {
    return this.siblingDiscountTierService.findAll(query);
  }
}
