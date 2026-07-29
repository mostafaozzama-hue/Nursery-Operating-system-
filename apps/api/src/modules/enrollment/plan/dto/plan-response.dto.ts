import { ApiProperty } from '@nestjs/swagger';
import { PLAN_BILLING_CYCLES, PlanBillingCycle } from './plan-billing-cycle';
import { PLAN_DAYS_OF_WEEK, PlanDayOfWeek } from './plan-day-of-week';

export class PlanResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: PLAN_BILLING_CYCLES })
  billingCycle!: PlanBillingCycle;

  @ApiProperty({ enum: PLAN_DAYS_OF_WEEK, isArray: true })
  scheduleDaysOfWeek!: PlanDayOfWeek[];

  @ApiProperty({ type: Date, nullable: true })
  scheduleStartTime!: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  scheduleEndTime!: Date | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
