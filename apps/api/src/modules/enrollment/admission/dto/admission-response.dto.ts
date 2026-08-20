import { ApiProperty } from '@nestjs/swagger';
import { ChildResponseDto } from '../../child/dto/child-response.dto';
import { EnrollmentResponseDto } from '../../enrollment/dto/enrollment-response.dto';
import { GuardianResponseDto } from '../../guardian/dto/guardian-response.dto';

export class AdmissionResponseDto {
  @ApiProperty({ type: ChildResponseDto })
  child!: ChildResponseDto;

  @ApiProperty({ type: [GuardianResponseDto], description: 'In the same order as the request guardians array' })
  guardians!: GuardianResponseDto[];

  @ApiProperty({ type: EnrollmentResponseDto })
  enrollment!: EnrollmentResponseDto;
}
