import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { ChangeBillingTermsDto } from './dto/change-billing-terms.dto';
import { EnrollmentBillingTermsResponseDto } from './dto/enrollment-billing-terms-response.dto';
import { EnrollmentBillingTermsService } from './enrollment-billing-terms.service';

/**
 * No POST/DELETE here - creation and closure are exclusively driven by the
 * paired Enrollment's own lifecycle (EnrollmentRepository.create/transfer/
 * withdraw calling openWithEnrollment/closeWithEnrollment in lockstep),
 * never directly. Read and the change action are OWNER/ADMIN-only for both
 * - carries customRateAmount/depositAmount, the same sensitivity class as
 * StaffPayroll (ADR-0011), not general tenant-member-readable.
 */
@ApiTags('enrollment-billing-terms')
@ApiCookieAuth()
@Controller('enrollments/:enrollmentId/billing-terms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
export class EnrollmentBillingTermsController {
  constructor(private readonly service: EnrollmentBillingTermsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current billing terms for an enrollment' })
  @ApiParam({ name: 'enrollmentId', format: 'uuid' })
  @ApiResponse({ status: 200, type: EnrollmentBillingTermsResponseDto })
  findCurrent(@Param('enrollmentId', ParseUUIDPipe) enrollmentId: string) {
    return this.service.findCurrent(enrollmentId);
  }

  @Patch()
  @ApiOperation({ summary: 'Change Plan/rate/guardian - closes the current terms and opens a new segment, next-cycle by default' })
  @ApiParam({ name: 'enrollmentId', format: 'uuid' })
  @ApiResponse({ status: 200, type: EnrollmentBillingTermsResponseDto })
  changeTerms(@Param('enrollmentId', ParseUUIDPipe) enrollmentId: string, @Body() dto: ChangeBillingTermsDto) {
    return this.service.changeTerms(enrollmentId, dto);
  }
}
