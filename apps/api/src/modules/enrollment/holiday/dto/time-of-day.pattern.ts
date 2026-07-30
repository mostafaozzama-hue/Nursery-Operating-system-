/** Same HH:mm[:ss] convention as plan/dto/time-of-day.pattern.ts and attendance/dto/time-of-day.pattern.ts - Holiday.earlyCloseTime is the same @db.Time column shape as those. */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
