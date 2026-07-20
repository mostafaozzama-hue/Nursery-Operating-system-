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
import { ChildService } from './child.service';
import { ChildQueryDto } from './dto/child-query.dto';
import { ChildResponseDto } from './dto/child-response.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@ApiTags('children')
@ApiCookieAuth()
@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Enroll a child' })
  @ApiResponse({ status: 201, type: ChildResponseDto })
  create(@Body() dto: CreateChildDto) {
    return this.childService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List children (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(ChildResponseDto)
  findAll(@Query() query: ChildQueryDto) {
    return this.childService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a child by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ChildResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.childService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update a child' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ChildResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateChildDto) {
    return this.childService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a child' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.childService.remove(id);
  }
}
