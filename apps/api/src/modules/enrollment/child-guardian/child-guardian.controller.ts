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
import { ChildGuardianService } from './child-guardian.service';
import { ChildGuardianQueryDto } from './dto/child-guardian-query.dto';
import { ChildGuardianResponseDto } from './dto/child-guardian-response.dto';
import { CreateChildGuardianDto } from './dto/create-child-guardian.dto';
import { UpdateChildGuardianDto } from './dto/update-child-guardian.dto';

/** Flat top-level resource by design - the relationship is queried from both the child and guardian side equally, so no single parent to nest under. */
@ApiTags('child-guardians')
@ApiCookieAuth()
@Controller('child-guardians')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildGuardianController {
  constructor(private readonly childGuardianService: ChildGuardianService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Link a guardian to a child' })
  @ApiResponse({ status: 201, type: ChildGuardianResponseDto })
  create(@Body() dto: CreateChildGuardianDto) {
    return this.childGuardianService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List child-guardian links (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(ChildGuardianResponseDto)
  findAll(@Query() query: ChildGuardianQueryDto) {
    return this.childGuardianService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a child-guardian link by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ChildGuardianResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.childGuardianService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update relationship type or contact flags (not childId/guardianId)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ChildGuardianResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateChildGuardianDto) {
    return this.childGuardianService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink a guardian from a child (soft-delete)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.childGuardianService.remove(id);
  }
}
