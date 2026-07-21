import { PartialType } from '@nestjs/swagger';
import { CreateLineItemDto } from './create-line-item.dto';

/** DRAFT-invoice-only, enforced in the repository, not by this DTO. */
export class UpdateLineItemDto extends PartialType(CreateLineItemDto) {}
