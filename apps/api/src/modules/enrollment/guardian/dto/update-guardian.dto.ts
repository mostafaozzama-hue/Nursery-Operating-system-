import { PartialType } from '@nestjs/swagger';
import { CreateGuardianDto } from './create-guardian.dto';

/**
 * Every field is independently editable here (unlike Enrollment's narrow
 * update DTO) - Guardian has no lifecycle to protect. The phone-or-email
 * requirement is deliberately create-only, per approved design.
 */
export class UpdateGuardianDto extends PartialType(CreateGuardianDto) {}
