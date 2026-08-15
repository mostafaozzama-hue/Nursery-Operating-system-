/** Same HH:mm[:ss] convention as attendance/dto/time-of-day.pattern.ts - Plan.scheduleStartTime/scheduleEndTime are the same @db.Time column shape as Attendance's checkInTime/checkOutTime. */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
