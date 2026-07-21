import { PartialType } from '@nestjs/swagger';
import { CreateStaffDto } from './create-staff.dto';

/** Every field is independently editable - Staff has no lifecycle to protect, same reasoning as Guardian. */
export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
