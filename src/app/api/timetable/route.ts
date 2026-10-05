import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Deterministic color palette for auto-created subjects
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];

function autoColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % COLORS.length;
  return COLORS[Math.abs(h)];
}

type SlotEntry = {
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const semester = await prisma.semester.findFirst({ where: { userId } });
    if (!semester) {
      return NextResponse.json({ message: 'No semester found' }, { status: 404 });
    }

    const body = await req.json();
    const { slots, replaceAll } = body as { slots: SlotEntry[]; replaceAll: boolean };

    if (!Array.isArray(slots)) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    // IDOR guard: get all subject IDs that belong to this semester
    const semesterSubjects = await prisma.subject.findMany({
      where: { semesterId: semester.id },
      select: { id: true, name: true },
    });

    if (replaceAll && semesterSubjects.length > 0) {
      await prisma.timetableSlot.deleteMany({
        where: { subjectId: { in: semesterSubjects.map(s => s.id) } },
      });
    }

    let created = 0;

    for (const slot of slots) {
      const name = slot.subjectName.trim();
      if (!name) continue;

      // Find or create subject — scoped to this semester only
      let subject = semesterSubjects.find(s => s.name === name)
        ?? await prisma.subject.findFirst({ where: { semesterId: semester.id, name } });

      if (!subject) {
        subject = await prisma.subject.create({
          data: {
            semesterId: semester.id,
            name,
            colorTag: autoColor(name),
          },
        });
        // Keep local cache up to date for remaining iterations
        semesterSubjects.push({ id: subject.id, name: subject.name });
      }

      await prisma.timetableSlot.create({
        data: {
          subjectId: subject.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      });
      created++;
    }

    return NextResponse.json({ message: 'Timetable saved', created }, { status: 200 });
  } catch (error: any) {
    console.error('Timetable save error:', error);
    return NextResponse.json({ message: error?.message ?? 'Something went wrong' }, { status: 500 });
  }
}
