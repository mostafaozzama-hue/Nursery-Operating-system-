import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaymentService } from './payment.service';

/**
 * Guardian-anchored, not invoice-anchored - the canonical payment recording
 * path (§2.1: Payment is no longer 1:1 with Invoice). Moves off
 * /invoices/:invoiceId/payments, which is now InvoiceController's
 * read-only view joining through PaymentAllocation.
 */
@ApiTags('payments')
@ApiCookieAuth()
@Controller('guardians/:guardianId/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Record a payment against a Guardian - allocated oldest-invoice-first across all their children' })
  @ApiParam({ name: 'guardianId', format: 'uuid' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  record(@Param('guardianId', ParseUUIDPipe) guardianId: string, @Body() dto: RecordPaymentDto) {
    return this.paymentService.record(guardianId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List payments recorded against a Guardian's account" })
  @ApiParam({ name: 'guardianId', format: 'uuid' })
  @ApiPaginatedResponse(PaymentResponseDto)
  findForGuardian(@Param('guardianId', ParseUUIDPipe) guardianId: string, @Query() query: PaymentQueryDto) {
    return this.paymentService.findForGuardian(guardianId, query);
  }
}
