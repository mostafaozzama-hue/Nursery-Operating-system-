import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { LineItemResponseDto } from './dto/line-item-response.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';
import { InvoiceService } from './invoice.service';

/**
 * Line items and payments are nested here, not flat top-level resources
 * (unlike Enrollment/ChildGuardian) - neither has an independent lifecycle
 * apart from its parent invoice. No top-level DELETE on invoices - they're
 * financial history, voided rather than deleted, same reasoning as
 * Enrollment/Attendance. Removing a DRAFT line item is the one DELETE in
 * this module, since a draft item isn't a financial record yet.
 */
@ApiTags('invoices')
@ApiCookieAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a draft invoice, optionally with initial line items' })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(InvoiceResponseDto)
  findAll(@Query() query: InvoiceQueryDto) {
    return this.invoiceService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Correct childId/billedToGuardianId/dueDate - draft only' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoiceService.update(id, dto);
  }

  @Post(':invoiceId/line-items')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add a line item - draft only' })
  @ApiParam({ name: 'invoiceId', format: 'uuid' })
  @ApiResponse({ status: 201, type: LineItemResponseDto })
  addLineItem(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Body() dto: CreateLineItemDto) {
    return this.invoiceService.addLineItem(invoiceId, dto);
  }

  @Patch(':invoiceId/line-items/:lineItemId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Edit a line item - draft only' })
  @ApiParam({ name: 'invoiceId', format: 'uuid' })
  @ApiParam({ name: 'lineItemId', format: 'uuid' })
  @ApiResponse({ status: 200, type: LineItemResponseDto })
  updateLineItem(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Param('lineItemId', ParseUUIDPipe) lineItemId: string,
    @Body() dto: UpdateLineItemDto,
  ) {
    return this.invoiceService.updateLineItem(invoiceId, lineItemId, dto);
  }

  @Delete(':invoiceId/line-items/:lineItemId')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a line item - draft only' })
  @ApiParam({ name: 'invoiceId', format: 'uuid' })
  @ApiParam({ name: 'lineItemId', format: 'uuid' })
  @ApiResponse({ status: 204 })
  removeLineItem(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Param('lineItemId', ParseUUIDPipe) lineItemId: string,
  ) {
    return this.invoiceService.removeLineItem(invoiceId, lineItemId);
  }

  @Post(':invoiceId/issue')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Issue a draft invoice (a zero-amount invoice is settled immediately)' })
  @ApiParam({ name: 'invoiceId', format: 'uuid' })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  issue(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Body() dto: IssueInvoiceDto) {
    return this.invoiceService.issue(invoiceId, dto);
  }

  @Post(':invoiceId/payments')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Record a payment against an issued invoice' })
  @ApiParam({ name: 'invoiceId', format: 'uuid' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  recordPayment(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Body() dto: RecordPaymentDto) {
    return this.invoiceService.recordPayment(invoiceId, dto);
  }

  @Get(':invoiceId/payments')
  @ApiOperation({ summary: 'List payments recorded against an invoice' })
  @ApiParam({ name: 'invoiceId', format: 'uuid' })
  @ApiPaginatedResponse(PaymentResponseDto)
  findPayments(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Query() query: PaymentQueryDto) {
    return this.invoiceService.findPayments(invoiceId, query);
  }

  @Post(':invoiceId/void')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Void an invoice (no cascade to existing line items/payments)' })
  @ApiParam({ name: 'invoiceId', format: 'uuid' })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  void(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    return this.invoiceService.void(invoiceId);
  }
}
