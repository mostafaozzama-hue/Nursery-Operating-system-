import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { PLAN_BILLING_CYCLES, PlanBillingCycle } from './plan-billing-cycle';
import { PLAN_DAYS_OF_WEEK, PlanDayOfWeek } from './plan-day-of-week';
import { TIME_OF_DAY_PATTERN } from './time-of-day.pattern';

export class CreatePlanDto {
  @ApiProperty({ example: 'Full Time' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: PLAN_BILLING_CYCLES })
  @IsIn(PLAN_BILLING_CYCLES)
  billingCycle!: PlanBillingCycle;

  @ApiProperty({ enum: PLAN_DAYS_OF_WEEK, isArray: true, description: 'Permitted attendance days' })
  @IsArray()
  @IsIn(PLAN_DAYS_OF_WEEK, { each: true })
  scheduleDaysOfWeek!: PlanDayOfWeek[];

  @ApiPropertyOptional({ example: '08:00', description: 'Nullable = any time within working hours' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'scheduleStartTime must be in HH:mm or HH:mm:ss format' })
  scheduleStartTime?: string;

  @ApiPropertyOptional({ example: '17:00', description: 'Nullable = any time within working hours' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'scheduleEndTime must be in HH:mm or HH:mm:ss format' })
  scheduleEndTime?: string;
}
