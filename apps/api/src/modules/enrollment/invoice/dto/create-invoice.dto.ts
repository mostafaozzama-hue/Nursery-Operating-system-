import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateLineItemDto } from './create-line-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  childId!: string;

  @ApiProperty({ format: 'uuid', description: 'Who is billed - may differ from the primary ChildGuardian contact' })
  @IsUUID()
  billedToGuardianId!: string;

  @ApiPropertyOptional({ example: '2024-09-30', description: 'Can also be set/overridden at issue time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ type: [CreateLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  lineItems?: CreateLineItemDto[];
}
