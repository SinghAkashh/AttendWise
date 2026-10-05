import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Check IDOR for the slot
    const slot = await prisma.timetableSlot.findUnique({
      where: { id: params.id },
      include: {
        subject: {
          include: { semester: true },
        },
      },
    });

    if (!slot || slot.subject.semester.userId !== userId) {
      return NextResponse.json({ message: 'Slot not found or unauthorized' }, { status: 404 });
    }

    await prisma.timetableSlot.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Slot deleted' });
  } catch (error) {
    return NextResponse.json({ message: 'Error deleting slot' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Check IDOR for the slot
    const slot = await prisma.timetableSlot.findUnique({
      where: { id: params.id },
      include: {
        subject: {
          include: { semester: true },
        },
      },
    });

    if (!slot || slot.subject.semester.userId !== userId) {
      return NextResponse.json({ message: 'Slot not found or unauthorized' }, { status: 404 });
    }

    const body = await req.json();
    const { dayOfWeek, startTime, endTime, subjectId } = body;

    // If subjectId is changing, verify the new subject also belongs to this user
    if (subjectId && subjectId !== slot.subjectId) {
      const targetSubject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: { semester: true },
      });
      if (!targetSubject || targetSubject.semester.userId !== userId) {
        return NextResponse.json({ message: 'Target subject not found or unauthorized' }, { status: 403 });
      }
    }

    const updated = await prisma.timetableSlot.update({
      where: { id: params.id },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek: parseInt(dayOfWeek) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(subjectId && { subjectId }),
      },
      include: {
        subject: true,
      },
    });

    return NextResponse.json({ slot: updated });
  } catch (error) {
    return NextResponse.json({ message: 'Error updating slot' }, { status: 500 });
  }
}

