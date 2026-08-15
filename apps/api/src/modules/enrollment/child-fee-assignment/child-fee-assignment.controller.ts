import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { ChildFeeAssignmentService } from './child-fee-assignment.service';
import { AssignChildFeeDto } from './dto/assign-child-fee.dto';
import { ChildFeeAssignmentQueryDto } from './dto/child-fee-assignment-query.dto';
import { ChildFeeAssignmentResponseDto } from './dto/child-fee-assignment-response.dto';
import { UnassignChildFeeDto } from './dto/unassign-child-fee.dto';

/**
 * Nested under Child (/children/:childId/fee-assignments), per §11's
 * literal Resource-column path - not the flat /child-guardians shape its
 * own "(same shape as child-guardian)" comparison might suggest. That
 * comparison is read as describing the general list/assign/unassign
 * pattern, not the URL nesting, since the table's own path is explicit and
 * concrete. unassign is a POST action (not DELETE) since it carries a
 * business date (effectiveTo), not just "remove now".
 */
@ApiTags('child-fee-assignments')
@ApiCookieAuth()
@Controller('children/:childId/fee-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildFeeAssignmentController {
  constructor(private readonly childFeeAssignmentService: ChildFeeAssignmentService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Assign an optional Fee to a Child' })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiResponse({ status: 201, type: ChildFeeAssignmentResponseDto })
  assign(@Param('childId', ParseUUIDPipe) childId: string, @Body() dto: AssignChildFeeDto) {
    return this.childFeeAssignmentService.assign(childId, dto);
  }

  @Post(':feeId/unassign')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Unassign a Fee from a Child as of a date' })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiParam({ name: 'feeId', format: 'uuid' })
  @ApiResponse({ status: 201 })
  unassign(
    @Param('childId', ParseUUIDPipe) childId: string,
    @Param('feeId', ParseUUIDPipe) feeId: string,
    @Body() dto: UnassignChildFeeDto,
  ) {
    return this.childFeeAssignmentService.unassign(childId, feeId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a Child's Fee assignments" })
  @ApiParam({ name: 'childId', format: 'uuid' })
  @ApiPaginatedResponse(ChildFeeAssignmentResponseDto)
  findForChild(@Param('childId', ParseUUIDPipe) childId: string, @Query() query: ChildFeeAssignmentQueryDto) {
    return this.childFeeAssignmentService.findForChild(childId, query);
  }
}
