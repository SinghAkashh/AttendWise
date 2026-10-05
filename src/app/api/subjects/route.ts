import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const semester = await prisma.semester.findFirst({ where: { userId } });
    if (!semester) return NextResponse.json({ message: 'No semester found' }, { status: 404 });

    const subjects = await prisma.subject.findMany({
      where: { semesterId: semester.id },
      include: { timetableSlots: true },
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching subjects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const semester = await prisma.semester.findFirst({ where: { userId } });
    if (!semester) return NextResponse.json({ message: 'No semester found' }, { status: 404 });

    const { name, colorTag } = await req.json();
    if (!name || !colorTag) return NextResponse.json({ message: 'Missing fields' }, { status: 400 });

    const subject = await prisma.subject.create({
      data: {
        semesterId: semester.id,
        name,
        colorTag,
      },
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error creating subject' }, { status: 500 });
  }
}
