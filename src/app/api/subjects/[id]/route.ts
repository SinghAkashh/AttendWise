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
  if (subject.semester.userId !== userId) return null; // IDOR check
  return subject;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    
    const subject = await checkSubjectAccess(params.id, userId);
    if (!subject) return NextResponse.json({ message: 'Subject not found or unauthorized' }, { status: 404 });

    const { name, colorTag } = await req.json();
    if (!name || !colorTag) return NextResponse.json({ message: 'Missing fields' }, { status: 400 });

    const updated = await prisma.subject.update({
      where: { id: params.id },
      data: { name, colorTag },
    });

    return NextResponse.json({ subject: updated });
  } catch (error) {
    return NextResponse.json({ message: 'Error updating subject' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    
    const subject = await checkSubjectAccess(params.id, userId);
    if (!subject) return NextResponse.json({ message: 'Subject not found or unauthorized' }, { status: 404 });

    await prisma.subject.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Subject deleted' });
  } catch (error) {
    return NextResponse.json({ message: 'Error deleting subject' }, { status: 500 });
  }
}
