import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePayrollDto } from './create-payroll.dto';

/** staffId is fixed at creation - which staff a payroll record belongs to isn't reassignable via update. */
export class UpdatePayrollDto extends PartialType(
  OmitType(CreatePayrollDto, ['staffId'] as const),
) {}
