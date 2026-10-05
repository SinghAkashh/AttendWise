import { AttendanceLog, TimetableSlot, Semester, Subject } from '@prisma/client';

export type SubjectWithRelations = Subject & {
  timetableSlots: TimetableSlot[];
  attendanceLogs: AttendanceLog[];
  semester?: Semester; // We can pass it or fetch it separately
};

/**
 * Computes remaining calendar days between a start date (usually tomorrow)
 * and the semester end date, counting only days that match the timetable slots,
 * excluding holidays and considering working Saturdays.
 * Timezone-agnostic: uses UTC methods for all calculations.
 */
export function getRemainingClasses(
  subject: SubjectWithRelations,
  semester: Semester,
  holidays: Date[],
  fromDate: Date = new Date()
): number {
  let remaining = 0;
  
  // Extract local calendar day parts of fromDate to create a UTC midnight starting point
  const todayLocal = new Date(fromDate);
  const todayUTC = new Date(Date.UTC(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate()));
  
  // Start from tomorrow UTC
  const current = new Date(todayUTC);
  current.setUTCDate(current.getUTCDate() + 1);

  // Normalize semester end date to UTC midnight
  const semEndLocal = new Date(semester.endDate);
  const end = new Date(Date.UTC(semEndLocal.getFullYear(), semEndLocal.getMonth(), semEndLocal.getDate()));
  
  // For quick holiday lookup: format to YYYY-MM-DD using UTC methods
  const holidayStrings = holidays.map(h => {
    const d = new Date(h);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Which days of week does this class meet?
  const classDays = new Set(subject.timetableSlots.map(s => s.dayOfWeek));

  while (current <= end) {
    const dayOfWeek = current.getUTCDay();
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, '0');
    const day = String(current.getUTCDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const isHoliday = holidayStrings.includes(dateString);
    const isWorkingDay = dayOfWeek !== 0 && (dayOfWeek !== 6 || semester.workingSaturdays);
    
    if (classDays.has(dayOfWeek) && !isHoliday && isWorkingDay) {
      remaining++;
    }
    
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return remaining;
}

export type PlannerMetrics = {
  attended: number;
  totalHeld: number;
  remaining: number;
  currentPercent: number;
  targetPercent: number;
  mustAttend: number;
  canSkip: number;
  unreachable: boolean;
  bestPossiblePercent: number;
};

/**
 * Pure math helper that runs the planner formulas.
 */
export function calculatePlannerMath(
  A: number,
  T: number,
  R: number,
  targetPercent: number
): PlannerMetrics {
  const P = targetPercent / 100.0;

  let mustAttend = 0;
  let canSkip = 0;
  let unreachable = false;

  const currentPercent = T === 0 ? 100 : Math.round((A / T) * 100);
  const bestPossiblePercent = (T + R) === 0 ? 100 : Math.round(((A + R) / (T + R)) * 100);

  if (T === 0 && R === 0) {
    return {
      attended: A,
      totalHeld: T,
      remaining: R,
      currentPercent,
      targetPercent,
      mustAttend: 0,
      canSkip: 0,
      unreachable: false,
      bestPossiblePercent
    };
  }

  const currentRatio = T === 0 ? 1.0 : A / T;

  if (currentRatio < P) {
    // Below target
    let x = Math.ceil(P * (T + R) - A);
    if (x < 0) x = 0;
    
    if (x > R) {
      unreachable = true;
      mustAttend = R;
      canSkip = 0;
    } else {
      mustAttend = x;
      canSkip = R - x;
    }
  } else {
    // At or above target
    let s = Math.floor(A / P - T);
    if (s < 0) s = 0;
    if (s > R) s = R;
    
    canSkip = s;
    mustAttend = R - s;
  }

  return {
    attended: A,
    totalHeld: T,
    remaining: R,
    currentPercent,
    targetPercent,
    mustAttend,
    canSkip,
    unreachable,
    bestPossiblePercent
  };
}

/**
 * Implements the planner math to compute required attendance or safe skips.
 */
export function calculateSubjectMetrics(
  subject: SubjectWithRelations,
  semester: Semester,
  targetPercent: number, // 0 to 100
  holidays: Date[] = []
): PlannerMetrics {
  let A = subject.baselineAttended ?? 0; // attended
  let T = subject.baselineHeld ?? 0; // total held

  // Only count 'present' and 'absent' for the total held count.
  for (const log of subject.attendanceLogs) {
    if (log.status === 'present') {
      A++;
      T++;
    } else if (log.status === 'absent') {
      T++;
    }
    // "holiday" and "cancelled" are ignored in T
  }

  const R = getRemainingClasses(subject, semester, holidays);

  return calculatePlannerMath(A, T, R, targetPercent);
}

/**
 * Simple simulator function for "What-if" projections
 */
export function simulateAbsences(metrics: PlannerMetrics, hypotheticalAbsences: number): number {
  if (hypotheticalAbsences > metrics.remaining) {
    hypotheticalAbsences = metrics.remaining;
  }
  
  const simulatedAttended = metrics.attended + (metrics.remaining - hypotheticalAbsences);
  const simulatedTotalHeld = metrics.totalHeld + metrics.remaining;
  
  if (simulatedTotalHeld === 0) return 100;
  return Math.round((simulatedAttended / simulatedTotalHeld) * 100);
}
