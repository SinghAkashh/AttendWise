import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/attendance/bulk
 * Body: { date: "YYYY-MM-DD", subjectIds: string[] }
 *
 * Upserts 'present' for each subjectId, but ONLY if no log already exists
 * for that subject+date. This means existing Absent/Cancelled entries
 * are never overwritten — "Mark all Present" is a shortcut, not a lock.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { date, subjectIds } = await req.json();
    if (!date || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const semester = await prisma.semester.findFirst({ where: { userId } });
    if (!semester) return NextResponse.json({ message: 'Semester not found' }, { status: 404 });

    // IDOR: verify every subjectId belongs to this user's semester
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds }, semesterId: semester.id },
      select: { id: true },
    });
    const validIds = new Set(subjects.map(s => s.id));
    const unauthorizedIds = subjectIds.filter(id => !validIds.has(id));
    if (unauthorizedIds.length > 0) {
      return NextResponse.json({ message: 'Unauthorized subjects in request' }, { status: 403 });
    }

    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(logDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find subjects that ALREADY have a log on this date — skip those
    const existingLogs = await prisma.attendanceLog.findMany({
      where: { subjectId: { in: subjectIds }, date: { gte: logDate, lt: nextDay } },
      select: { subjectId: true },
    });
    const alreadyLogged = new Set(existingLogs.map(l => l.subjectId));
    const toCreate = subjectIds.filter(id => !alreadyLogged.has(id));

    if (toCreate.length > 0) {
      await prisma.attendanceLog.createMany({
        data: toCreate.map(subjectId => ({ subjectId, date: logDate, status: 'present' })),
      });
    }

    return NextResponse.json({ marked: toCreate.length, skipped: alreadyLogged.size });
  } catch (error) {
    console.error('Bulk attendance error:', error);
    return NextResponse.json({ message: 'Error bulk-marking attendance' }, { status: 500 });
  }
}
