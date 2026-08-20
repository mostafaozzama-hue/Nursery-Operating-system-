import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiPaginatedResponse } from '../../../common/pagination/api-paginated-response.decorator';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { ChildPhotoStorageService } from './child-photo-storage.service';
import { ChildService } from './child.service';
import { ChildQueryDto } from './dto/child-query.dto';
import { ChildResponseDto } from './dto/child-response.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

const ALLOWED_PHOTO_MIME_TYPES = /^image\/(jpeg|png|webp|gif)$/;

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

  /**
   * Easy Enrollment (Product Gap H, phase 2) - local-disk MVP upload, not a
   * new storage provider. See ChildPhotoStorageService's doc comment for the
   * documented single-instance limitation. fileFilter rejects a non-image
   * mimetype before Multer buffers it; limits.fileSize enforces the 5MB cap
   * at the parser level (a request over the limit never reaches the handler).
   */
  @Post(':id/photo')
  @Roles('OWNER', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: ChildPhotoStorageService.MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        callback(
          ALLOWED_PHOTO_MIME_TYPES.test(file.mimetype)
            ? null
            : new BadRequestException('Only JPEG, PNG, WEBP, or GIF images are accepted'),
          ALLOWED_PHOTO_MIME_TYPES.test(file.mimetype),
        );
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Upload a Child's photo (replaces any existing one)" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: ChildResponseDto })
  uploadPhoto(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No photo file was provided');
    }
    return this.childService.uploadPhoto(id, file);
  }

  /**
   * Authenticated read, same visibility as GET /children/:id (JwtAuthGuard +
   * RolesGuard's open-read, no additional @Roles) - deliberately not a plain
   * static file mount, so tenant/classroom-scope rules apply to a child's
   * photo exactly like every other piece of their data.
   */
  @Get(':id/photo')
  @ApiOperation({ summary: "Stream a Child's uploaded photo" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200 })
  async getPhoto(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const filePath = await this.childService.resolvePhotoPath(id);
    if (!filePath) {
      throw new NotFoundException('No photo has been uploaded for this child');
    }
    res.set('Cache-Control', 'private, max-age=60');
    res.sendFile(filePath);
  }
}
