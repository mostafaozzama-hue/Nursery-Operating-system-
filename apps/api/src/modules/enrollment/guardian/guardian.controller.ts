import {
  Body,
  Controller,
  Delete,
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
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { GuardianQueryDto } from './dto/guardian-query.dto';
import { GuardianResponseDto } from './dto/guardian-response.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { GuardianService } from './guardian.service';

@ApiTags('guardians')
@ApiCookieAuth()
@Controller('guardians')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a guardian contact profile' })
  @ApiResponse({ status: 201, type: GuardianResponseDto })
  create(@Body() dto: CreateGuardianDto) {
    return this.guardianService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List guardians (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(GuardianResponseDto)
  findAll(@Query() query: GuardianQueryDto) {
    return this.guardianService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a guardian by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: GuardianResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardianService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a guardian' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: GuardianResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGuardianDto) {
    return this.guardianService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a guardian' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardianService.remove(id);
  }
}
