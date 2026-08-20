import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { AdmissionService } from './admission.service';
import { AdmissionResponseDto } from './dto/admission-response.dto';
import { CreateAdmissionDto } from './dto/create-admission.dto';

/**
 * Easy Enrollment (Product Gap H) - a single orchestrated call over the
 * existing Child/Guardian/ChildGuardian/Enrollment endpoints, not a new
 * enrollment concept. Same role gate as POST /enrollments and POST /children.
 */
@ApiTags('admissions')
@ApiCookieAuth()
@Controller('admissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdmissionController {
  constructor(private readonly admissionService: AdmissionService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Enroll a child in one step: create/link guardians and open the enrollment atomically' })
  @ApiResponse({ status: 201, type: AdmissionResponseDto })
  create(@Body() dto: CreateAdmissionDto) {
    return this.admissionService.create(dto);
  }
}
