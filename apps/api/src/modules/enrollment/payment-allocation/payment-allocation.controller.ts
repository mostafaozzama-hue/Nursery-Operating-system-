import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { AvailableCreditResponseDto } from './dto/available-credit-response.dto';
import { PaymentAllocationService } from './payment-allocation.service';

/**
 * Only route this service has (§4's interface also names allocate() and
 * reallocateCredit(), but allocate() is a composable with no route of its
 * own - always a side effect of PaymentService.record - and
 * reallocateCredit() is deliberately deferred, §13: no caller anywhere in
 * this design yet). Read-only, any authenticated tenant member - matches
 * §9's "system-internal... never a direct write endpoint" for
 * PaymentAllocation itself.
 */
@ApiTags('payment-allocations')
@ApiCookieAuth()
@Controller('guardians/:guardianId/credit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentAllocationController {
  constructor(private readonly paymentAllocationService: PaymentAllocationService) {}

  @Get()
  @ApiOperation({ summary: "Get a guardian's computed available credit (unallocated payment remainder)" })
  @ApiParam({ name: 'guardianId', format: 'uuid' })
  @ApiResponse({ status: 200, type: AvailableCreditResponseDto })
  async getAvailableCredit(@Param('guardianId', ParseUUIDPipe) guardianId: string): Promise<AvailableCreditResponseDto> {
    const availableCredit = await this.paymentAllocationService.getAvailableCredit(guardianId);
    return { availableCredit };
  }
}
