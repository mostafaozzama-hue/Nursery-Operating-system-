import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { PLAN_BILLING_CYCLES, PlanBillingCycle } from './plan-billing-cycle';
import { PLAN_DAYS_OF_WEEK, PlanDayOfWeek } from './plan-day-of-week';
import { TIME_OF_DAY_PATTERN } from './time-of-day.pattern';

/**
 * isActive is deliberately absent - activate/deactivate is its own action
 * (PlanController.activate/deactivate -> PlanService.setActive), not part of
 * ordinary field editing, per the approved Backend Services design.
 */
export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Full Time' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: PLAN_BILLING_CYCLES })
  @IsOptional()
  @IsIn(PLAN_BILLING_CYCLES)
  billingCycle?: PlanBillingCycle;

  @ApiPropertyOptional({ enum: PLAN_DAYS_OF_WEEK, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(PLAN_DAYS_OF_WEEK, { each: true })
  scheduleDaysOfWeek?: PlanDayOfWeek[];

  @ApiPropertyOptional({ example: '08:00', description: 'Set to null to clear' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'scheduleStartTime must be in HH:mm or HH:mm:ss format' })
  scheduleStartTime?: string | null;

  @ApiPropertyOptional({ example: '17:00', description: 'Set to null to clear' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'scheduleEndTime must be in HH:mm or HH:mm:ss format' })
  scheduleEndTime?: string | null;
}
