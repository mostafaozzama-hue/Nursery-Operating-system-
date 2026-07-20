import {
  Body,
  Controller,
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
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { TransferEnrollmentDto } from './dto/transfer-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { WithdrawEnrollmentDto } from './dto/withdraw-enrollment.dto';

/**
 * No DELETE route - enrollment is historical data, not a CRUD resource.
 * Corrections go through controlled admin tooling later, not a delete
 * endpoint. Lifecycle changes (classroom change, closing) go through
 * transfer/withdraw, never PATCH.
 */
@ApiTags('enrollments')
@ApiCookieAuth()
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create an initial enrollment (or re-enrollment) for a child' })
  @ApiResponse({ status: 201, type: EnrollmentResponseDto })
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List enrollments (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(EnrollmentResponseDto)
  findAll(@Query() query: EnrollmentQueryDto) {
    return this.enrollmentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an enrollment by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Correct the created-reason text (not a lifecycle change)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEnrollmentDto) {
    return this.enrollmentService.update(id, dto);
  }

  @Post(':id/transfer')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Transfer to a different classroom (atomically closes current, opens new)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: EnrollmentResponseDto })
  transfer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferEnrollmentDto) {
    return this.enrollmentService.transfer(id, dto);
  }

  @Post(':id/withdraw')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a child (closes enrollment, status becomes WITHDRAWN)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  withdraw(@Param('id', ParseUUIDPipe) id: string, @Body() dto: WithdrawEnrollmentDto) {
    return this.enrollmentService.withdraw(id, dto);
  }
}
