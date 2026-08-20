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
import { CreateWaiverDto } from './dto/create-waiver.dto';
import { UpdateWaiverDto } from './dto/update-waiver.dto';
import { WaiverQueryDto } from './dto/waiver-query.dto';
import { WaiverResponseDto } from './dto/waiver-response.dto';
import { WaiverService } from './waiver.service';

/**
 * Nested under Child (/children/:childId/waivers), matching every other
 * Child-scoped controller in this build order. §4's frozen update()
 * signature has no childId parameter (tenantId + id are sufficient to
 * locate a unique row) - childId stays in the URL only for path
 * consistency with create/findForChild and is not forwarded to the
 * service for update.
 *
 * All three routes are OWNER/ADMIN-only, including the GET, per §9's
 * restricted-read finding - unlike ChildDiscountAssignmentController's
 * unrestricted findForChild, Waiver read access is deliberately narrower
 * because a Waiver record carries a reason/justification for a fee
 * reduction (financial + HR-adjacent sensitivity), not just a fee
 * selection.
 */
@ApiTags('waivers')
@ApiCookieAuth()
@Controller('children/:childId/waivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class WaiverController {
  constructor(private readonly waiverService: WaiverService) {}

  @Post()
  @ApiOperation({ summary: 'Create a Waiver for a Child' })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiResponse({ status: 201, type: WaiverResponseDto })
  create(@Param('childId', ParseUUIDPipe) childId: string, @Body() dto: CreateWaiverDto) {
    return this.waiverService.create(childId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Waiver' })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: WaiverResponseDto })
  update(@Param('childId', ParseUUIDPipe) _childId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWaiverDto) {
    return this.waiverService.update(id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a Child's Waivers" })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiPaginatedResponse(WaiverResponseDto)
  findForChild(@Param('childId', ParseUUIDPipe) childId: string, @Query() query: WaiverQueryDto) {
    return this.waiverService.findForChild(childId, query);
  }

  /**
   * Waiver bug fix (Easy Enrollment, Product Gap H phase 2) - real removal,
   * using this codebase's existing universal soft-delete convention
   * (ADR-0013), same as every other entity's DELETE route. The additive-
   * stacking model itself is unchanged - this only lets a mistaken waiver
   * be taken off.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a Waiver' })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  remove(@Param('childId', ParseUUIDPipe) _childId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.waiverService.remove(id);
  }
}
