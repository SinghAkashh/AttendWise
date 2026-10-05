import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const data = await req.json();
    const subjectsToUpdate: { id: string; baselineAttended: number; baselineHeld: number }[] = data.subjects;

    if (!Array.isArray(subjectsToUpdate)) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    // IDOR protection: Verify all subjects belong to the current user
    const subjectIds = subjectsToUpdate.map(s => s.id);
    const existingSubjects = await prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
      },
      include: {
        semester: true,
      },
    });

    for (const subject of existingSubjects) {
      if (subject.semester.userId !== userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    // Perform updates sequentially or via transaction
    const updatePromises = subjectsToUpdate.map(sub => {
      // Basic validation
      const attended = Math.max(0, sub.baselineAttended || 0);
      const held = Math.max(0, sub.baselineHeld || 0);
      const validAttended = attended > held ? held : attended;

      return prisma.subject.update({
        where: { id: sub.id },
        data: {
          baselineAttended: { set: validAttended },
          baselineHeld: { set: held },
        },
      });
    });

    await prisma.$transaction(updatePromises);

    return NextResponse.json({ message: 'Success' });
  } catch (error) {
    console.error('Backfill API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
