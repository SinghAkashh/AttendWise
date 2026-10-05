import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch logs for a given date
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const url = new URL(req.url);
    const dateStr = url.searchParams.get('date');
    if (!dateStr) return NextResponse.json({ message: 'date query param required' }, { status: 400 });

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const semester = await prisma.semester.findFirst({ where: { userId } });
    if (!semester) return NextResponse.json({ logs: [] });

    const logs = await prisma.attendanceLog.findMany({
      where: {
        date: { gte: date, lt: nextDay },
        subject: { semesterId: semester.id },
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching logs' }, { status: 500 });
  }
}

// POST: Upsert single attendance log
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { subjectId, date, status } = await req.json();

    if (!subjectId || !date || !status) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    // IDOR check
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true },
    });

    if (!subject || subject.semester.userId !== userId) {
      return NextResponse.json({ message: 'Subject not found or unauthorized' }, { status: 404 });
    }

    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    const log = await prisma.attendanceLog.upsert({
      where: { subjectId_date: { subjectId, date: logDate } },
      update: { status },
      create: { subjectId, date: logDate, status },
    });

    return NextResponse.json({ log }, { status: 200 });
  } catch (error) {
    console.error('Attendance API Error:', error);
    return NextResponse.json({ message: 'Error logging attendance' }, { status: 500 });
  }
}

// DELETE: Remove a single log (used by Undo when there was no previous state)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { subjectId, date } = await req.json();
    if (!subjectId || !date) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    // IDOR check via subject → semester → userId
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true },
    });
    if (!subject || subject.semester.userId !== userId) {
      return NextResponse.json({ message: 'Subject not found or unauthorized' }, { status: 404 });
    }

    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    await prisma.attendanceLog.deleteMany({
      where: { subjectId, date: logDate },
    });

    return NextResponse.json({ message: 'Log deleted' });
  } catch (error) {
    console.error('Attendance DELETE Error:', error);
    return NextResponse.json({ message: 'Error deleting log' }, { status: 500 });
  }
}
