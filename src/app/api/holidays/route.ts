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
    if (!semester) return NextResponse.json({ holidays: [] });

    const holidays = await prisma.holiday.findMany({
      where: { semesterId: semester.id },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching holidays' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const semester = await prisma.semester.findFirst({ where: { userId } });
    if (!semester) return NextResponse.json({ message: 'Semester not found' }, { status: 404 });

    const { date, name } = await req.json();
    if (!date) return NextResponse.json({ message: 'Missing date' }, { status: 400 });

    // Parse date as UTC midnight to prevent timezone shifts
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));

    // Find if a holiday already exists on this date
    const existing = await prisma.holiday.findFirst({
      where: {
        semesterId: semester.id,
        date: targetDate,
      },
    });

    if (existing) {
      if (existing.source === 'auto') {
        return NextResponse.json(
          { message: 'This is an auto-imported holiday and cannot be removed.' },
          { status: 400 }
        );
      }
      
      // Delete manual holiday
      await prisma.holiday.delete({ where: { id: existing.id } });
      return NextResponse.json({ toggled: false, message: 'Holiday removed' });
    } else {
      // Create manual holiday
      const holiday = await prisma.holiday.create({
        data: {
          semesterId: semester.id,
          date: targetDate,
          name: name || 'Manual Holiday',
          source: 'manual',
        },
      });
      return NextResponse.json({ toggled: true, holiday });
    }
  } catch (error) {
    console.error('Holiday API Error:', error);
    return NextResponse.json({ message: 'Error updating holiday' }, { status: 500 });
  }
}
