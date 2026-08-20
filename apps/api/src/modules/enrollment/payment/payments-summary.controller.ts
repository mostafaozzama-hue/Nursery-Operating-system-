import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { PaymentSummaryQueryDto } from './dto/payment-summary-query.dto';
import { PaymentSummaryResponseDto } from './dto/payment-summary-response.dto';
import { PaymentService } from './payment.service';

/**
 * Tenant-wide payment summary (Owner Dashboard financial snapshot) -
 * deliberately a separate controller from PaymentController, which is
 * guardian-anchored (@Controller('guardians/:guardianId/payments')) and
 * has no tenant-wide route to extend without changing its path semantics.
 * The first tenant-wide Payment read in the product.
 */
@ApiTags('payments')
@ApiCookieAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsSummaryController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('summary')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Collected-amount total for an optional period (Payment.paidAt basis)' })
  @ApiResponse({ status: 200, type: PaymentSummaryResponseDto })
  getSummary(@Query() query: PaymentSummaryQueryDto) {
    return this.paymentService.getSummary(query);
  }
}
