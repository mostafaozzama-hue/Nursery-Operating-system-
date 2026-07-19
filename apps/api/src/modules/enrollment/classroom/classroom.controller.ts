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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClassroomService } from './classroom.service';
import { ClassroomQueryDto } from './dto/classroom-query.dto';
import { ClassroomResponseDto } from './dto/classroom-response.dto';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { PaginatedClassroomResponseDto } from './dto/paginated-classroom-response.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@ApiTags('classrooms')
@Controller('classrooms')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a classroom' })
  @ApiResponse({ status: 201, type: ClassroomResponseDto })
  create(@Body() dto: CreateClassroomDto) {
    return this.classroomService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List classrooms (paginated, filterable, sortable)' })
  @ApiResponse({ status: 200, type: PaginatedClassroomResponseDto })
  findAll(@Query() query: ClassroomQueryDto) {
    return this.classroomService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a classroom by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ClassroomResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.classroomService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a classroom' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ClassroomResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClassroomDto) {
    return this.classroomService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a classroom' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.classroomService.remove(id);
  }
}
