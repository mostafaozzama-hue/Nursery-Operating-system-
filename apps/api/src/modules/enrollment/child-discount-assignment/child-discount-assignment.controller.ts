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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { ChildDiscountAssignmentService } from './child-discount-assignment.service';
import { AssignChildDiscountDto } from './dto/assign-child-discount.dto';
import { ChildDiscountAssignmentQueryDto } from './dto/child-discount-assignment-query.dto';
import { ChildDiscountAssignmentResponseDto } from './dto/child-discount-assignment-response.dto';
import { ExpireChildDiscountDto } from './dto/expire-child-discount.dto';

/**
 * Nested under Child (/children/:childId/discount-assignments), per §11's
 * literal path - stated cleanly this time, with no conflicting comparison
 * to reconcile (unlike ChildFeeAssignmentController's). discountId is a
 * URL param on assign too (POST .../:discountId), not a body field -
 * matching §4's frozen signature, which lists discountId as its own
 * parameter separate from the {effectiveFrom, effectiveTo?} dto; this is
 * why AssignChildDiscountDto carries no discountId field. expire is a POST
 * action (not DELETE), matching ChildFeeAssignmentController.unassign's
 * precedent - it carries a business date (effectiveTo), not just "remove
 * now".
 */
@ApiTags('child-discount-assignments')
@ApiCookieAuth()
@Controller('children/:childId/discount-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildDiscountAssignmentController {
  constructor(private readonly childDiscountAssignmentService: ChildDiscountAssignmentService) {}

  @Post(':discountId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Assign a Discount to a Child' })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiParam({ name: 'discountId', format: 'uuid' })
  @ApiResponse({ status: 201, type: ChildDiscountAssignmentResponseDto })
  assign(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Param('discountId', ParseUUIDPipe) discountId: string,
    @Body() dto: AssignChildDiscountDto,
  ) {
    return this.childDiscountAssignmentService.assign(childId, discountId, dto);
  }

  @Post(':discountId/expire')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Expire a Discount assignment for a Child as of a date' })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiParam({ name: 'discountId', format: 'uuid' })
  @ApiResponse({ status: 201 })
  expire(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Param('discountId', ParseUUIDPipe) discountId: string,
    @Body() dto: ExpireChildDiscountDto,
  ) {
    return this.childDiscountAssignmentService.expire(childId, discountId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a Child's Discount assignments" })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiPaginatedResponse(ChildDiscountAssignmentResponseDto)
  findForChild(@Param('childId', ParseUUIDPipe) childId: string, @Query() query: ChildDiscountAssignmentQueryDto) {
    return this.childDiscountAssignmentService.findForChild(childId, query);
  }

  /**
   * Discount bug fix (Easy Enrollment, Product Gap H phase 2) - real
   * removal, using this codebase's existing universal soft-delete
   * convention (ADR-0013), same as every other entity's DELETE route.
   * Distinct from expire (a scheduled future close) - see
   * ChildDiscountAssignmentRepository.softDelete's doc comment.
   */
  @Delete(':discountId')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a Discount assignment from a Child (soft-delete, not a scheduled expiry)" })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiParam({ name: 'discountId', format: 'uuid' })
  @ApiResponse({ status: 204 })
  remove(@Param('childId', ParseUUIDPipe) childId: string, @Param('discountId', ParseUUIDPipe) discountId: string) {
    return this.childDiscountAssignmentService.remove(childId, discountId);
  }
}
