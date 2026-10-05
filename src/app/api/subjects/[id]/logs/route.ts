import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const subjectId = params.id;

    // IDOR check via subject -> semester -> userId
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { semester: true },
    });

    if (!subject || subject.semester.userId !== userId) {
      return NextResponse.json({ message: 'Subject not found or unauthorized' }, { status: 404 });
    }

    await prisma.attendanceLog.deleteMany({
      where: { subjectId },
    });

    return NextResponse.json({ message: 'All logs deleted for this subject' });
  } catch (error) {
    console.error('Bulk Delete Logs Error:', error);
    return NextResponse.json({ message: 'Error deleting logs' }, { status: 500 });
  }
}
