import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkSubjectAccess(subjectId: string, userId: string) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { semester: true },
  });
  if (!subject) return null;
  if (subject.semester.userId !== userId) return null;
  return subject;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    
    const subject = await checkSubjectAccess(params.id, userId);
    if (!subject) return NextResponse.json({ message: 'Subject not found or unauthorized' }, { status: 404 });

    const { dayOfWeek, startTime, endTime } = await req.json();
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const slot = await prisma.timetableSlot.create({
      data: {
        subjectId: params.id,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
      },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error creating slot' }, { status: 500 });
  }
}
