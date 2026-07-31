import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { AddOneTimeChargeDto } from './dto/add-one-time-charge.dto';
import { OneTimeChargeService } from './one-time-charge.service';

/**
 * Only route this service has (§4's interface has only add()) - reads go
 * through the existing GET /invoices/:invoiceId/line-items, unchanged.
 * OWNER/ADMIN/STAFF, confirmed against InvoiceController.recordPayment's
 * identical role set, not just §9's prose ("LATE_PICKUP is plausibly a
 * front-desk action, matching Payment's tier").
 */
@ApiTags('one-time-charges')
@ApiCookieAuth()
@Controller('invoices/:invoiceId/one-time-charges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'STAFF')
export class OneTimeChargeController {
  constructor(private readonly oneTimeChargeService: OneTimeChargeService) {}

  @Post()
  @ApiOperation({ summary: 'Add an ad hoc charge to an invoice (draft or already-issued)' })
  @ApiParam({ name: 'invoiceId', format: 'uuid' })
  @ApiResponse({ status: 201 })
  add(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Body() dto: AddOneTimeChargeDto) {
    return this.oneTimeChargeService.add(invoiceId, dto);
  }
}
