import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { JwtPayload } from '../types/authenticated-request';
import { MembershipQueryDto } from './dto/membership-query.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipService } from './membership.service';

/**
 * OWNER/ADMIN only, for both read and write - unlike domain modules where
 * STAFF gets read access, membership records are HR-adjacent (who has
 * access to this tenant, at what level), same reasoning Staff's read
 * boundary used, not the Attendance-style operational-task carve-out.
 */
@ApiTags('memberships')
@ApiCookieAuth()
@Controller('memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  @ApiOperation({ summary: 'List memberships of the current tenant (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(MembershipResponseDto)
  findAll(@Query() query: MembershipQueryDto) {
    return this.membershipService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change a membership\'s status or role' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: MembershipResponseDto })
  @ApiResponse({ status: 403, description: 'Self-modification, or non-OWNER touching/granting OWNER' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.membershipService.update(id, dto, { role: user.role, membershipId: user.membershipId });
  }
}
