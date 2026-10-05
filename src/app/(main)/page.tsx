import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DailyTracker from './DailyTracker';
import SubjectCards from './SubjectCards';
import { calculateSubjectMetrics, calculatePlannerMath, SubjectWithRelations } from '@/lib/attendance';
import Link from 'next/link';
import { Grid3x3, ArrowRight } from 'lucide-react';
import EditSemesterModal from './EditSemesterModal';

import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const userId = (session.user as { id: string }).id;

  const semester = await prisma.semester.findFirst({
    where: { userId },
    include: { holidays: true },
  });

  const subjectsRaw = await prisma.subject.findMany({
    where: { semesterId: semester?.id },
    include: {
      timetableSlots: true,
      attendanceLogs: true,
    },
    orderBy: { name: 'asc' },
  });

  // Get user's target percentage
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const targetPercent = user?.targetPercent ?? 75;

  const holidays = semester?.holidays.map(h => new Date(h.date)) ?? [];

  // Compute planner metrics for each subject server-side
  const subjectMetrics = subjectsRaw.map(subject => {
    const metrics = semester
      ? calculateSubjectMetrics(
          subject as SubjectWithRelations,
          semester,
          targetPercent,
          holidays
        )
      : {
          attended: 0, totalHeld: 0, remaining: 0,
          currentPercent: 100, targetPercent, mustAttend: 0,
          canSkip: 0, unreachable: false, bestPossiblePercent: 100,
        };

    return {
      id: subject.id,
      name: subject.name,
      colorTag: subject.colorTag,
      baselineAttended: subject.baselineAttended,
      baselineHeld: subject.baselineHeld,
      metrics,
    };
  });

  // Subjects (slim shape) passed to client DailyTracker
  const subjectsForTracker = subjectsRaw.map(s => ({
    id: s.id,
    name: s.name,
    colorTag: s.colorTag,
    timetableSlots: s.timetableSlots,
  }));

  const hasAnySlots = subjectsRaw.some(s => s.timetableSlots.length > 0);

  // Aggregate overall attendance metrics using the same planner math
  const totalAttended = subjectMetrics.reduce((sum, sm) => sum + sm.metrics.attended, 0);
  const totalHeld = subjectMetrics.reduce((sum, sm) => sum + sm.metrics.totalHeld, 0);
  const totalRemaining = subjectMetrics.reduce((sum, sm) => sum + sm.metrics.remaining, 0);
  const autoHolidayCount = semester?.holidays.filter(h => h.source === 'auto').length ?? 0;

  const overallMetrics = calculatePlannerMath(
    totalAttended,
    totalHeld,
    totalRemaining,
    targetPercent
  );

  // Semester progress — computed server-side, timezone-agnostic (UTC midnight)
  const semesterProgress = (() => {
    if (!semester) return null;
    const todayUTC = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
    const startUTC = new Date(semester.startDate).getTime();
    const endUTC   = new Date(semester.endDate).getTime();
    const totalMs  = endUTC - startUTC;
    if (totalMs <= 0) return null;
    if (todayUTC < startUTC) return { label: 'Not started', pct: 0, week: 0, totalWeeks: Math.ceil(totalMs / (7 * 86400000)) };
    if (todayUTC > endUTC)   return { label: 'Semester ended', pct: 100, week: null, totalWeeks: Math.ceil(totalMs / (7 * 86400000)) };
    const elapsedMs   = todayUTC - startUTC;
    const pct         = Math.round((elapsedMs / totalMs) * 100);
    const currentWeek = Math.ceil((elapsedMs + 1) / (7 * 86400000));
    const totalWeeks  = Math.ceil(totalMs / (7 * 86400000));
    return { label: `Week ${currentWeek} of ${totalWeeks}`, pct, week: currentWeek, totalWeeks };
  })();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-outfit text-indigo-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Track today&apos;s classes and monitor your semester progress.</p>
      </div>

      {/* First-time nudge: no timetable set up yet */}
      {!hasAnySlots && (
        <Link
          href="/timetable?onboarding=true"
          className="flex items-center justify-between p-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Grid3x3 size={22} />
            </div>
            <div>
              <p className="font-bold font-outfit text-lg">Set up your timetable</p>
              <p className="text-sm text-indigo-200 mt-0.5">Fill in your weekly schedule to start tracking attendance</p>
            </div>
          </div>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
      )}

      {/* Overall Attendance Summary Card */}
      {subjectsRaw.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold tracking-wider text-indigo-200 uppercase">Overall Status</span>
              <h2 className="text-2xl font-bold font-outfit mt-1">Attendance Summary</h2>
              {semester && (
                <p className="text-xs text-indigo-300 mt-1">
                  {new Date(semester.startDate).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}
                  {' – '}
                  {new Date(semester.endDate).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1">
                <div className="bg-indigo-800/50 border border-indigo-700/50 px-3 py-1 rounded-xl text-sm font-semibold text-indigo-200">
                  Target: {targetPercent}%
                </div>
                {semester && (
                  <EditSemesterModal
                    semester={{
                      startDate: semester.startDate.toISOString(),
                      endDate: semester.endDate.toISOString(),
                      country: semester.country,
                      workingSaturdays: semester.workingSaturdays,
                    }}
                  />
                )}
              </div>
              {autoHolidayCount > 0 && (
                <span className="text-[11px] font-medium text-indigo-300">
                  {autoHolidayCount} Public Holidays
                </span>
              )}
            </div>
          </div>

          {/* Semester progress bar */}
          {semesterProgress && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-300 font-medium">{semesterProgress.label}</span>
                <span className="text-indigo-400">{semesterProgress.pct}% of semester elapsed</span>
              </div>
              <div className="h-1.5 w-full bg-indigo-800/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${semesterProgress.pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <p className="text-sm text-indigo-200">Current %</p>
              <p className="text-3xl font-extrabold font-outfit mt-1 text-indigo-50">{overallMetrics.currentPercent}%</p>
            </div>
            <div>
              <p className="text-sm text-indigo-200">Attended / Held</p>
              <p className="text-xl font-bold font-outfit mt-2 text-indigo-50">{overallMetrics.attended} / {overallMetrics.totalHeld}</p>
            </div>
            <div>
              <p className="text-sm text-indigo-200">Must Attend</p>
              <p className="text-xl font-bold font-outfit mt-2 text-indigo-50">{overallMetrics.mustAttend} / {overallMetrics.remaining}</p>
            </div>
            <div>
              <p className="text-sm text-indigo-200">Can Skip</p>
              <p className="text-xl font-bold font-outfit mt-2 text-indigo-50">{overallMetrics.canSkip}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-indigo-800/60 text-xs text-indigo-200 flex items-center gap-1">
            <span className="font-semibold text-amber-300">Note:</span>
            <span>Total across all subjects — doesn&apos;t indicate which class to skip</span>
          </div>
        </div>
      )}

      {/* Daily Tracker */}
      <DailyTracker subjects={subjectsForTracker} />

      {/* Subject Metrics Cards */}
      <div>
        <h2 className="text-xl font-semibold font-outfit text-indigo-900 mb-4">
          Attendance Overview
        </h2>
        <SubjectCards subjectMetrics={subjectMetrics} />
      </div>
    </div>
  );
}
