import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import publicHolidays from '@/data/holidays-in.json';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Verify the user still exists in the DB (session JWT can outlive a deleted account)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { message: 'Your session is invalid. Please log out and sign up again.' },
        { status: 401 }
      );
    }

    // Check if user already has a semester
    const existingSemester = await prisma.semester.findFirst({
      where: { userId },
    });

    if (existingSemester) {
      return NextResponse.json({ message: 'Already onboarded' }, { status: 400 });
    }

    const body = await req.json();
    const { startDate, endDate, country, workingSaturdays, targetPercent } = body;

    if (!startDate || !endDate || !country || targetPercent === undefined) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    // Update user target percent
    await prisma.user.update({
      where: { id: userId },
      data: { targetPercent },
    });

    // Create semester
    const semester = await prisma.semester.create({
      data: {
        userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        country,
        workingSaturdays: Boolean(workingSaturdays),
      },
    });

    // Automatically import public holidays that fall within the semester range
    try {
      const startVal = new Date(startDate);
      const endVal = new Date(endDate);
      const startUTC = new Date(Date.UTC(startVal.getFullYear(), startVal.getMonth(), startVal.getDate()));
      const endUTC = new Date(Date.UTC(endVal.getFullYear(), endVal.getMonth(), endVal.getDate()));

      const toCreate = [];
      for (const h of publicHolidays) {
        const [year, month, day] = h.date.split('-').map(Number);
        const hDate = new Date(Date.UTC(year, month - 1, day));
        
        if (hDate >= startUTC && hDate <= endUTC) {
          toCreate.push({
            semesterId: semester.id,
            date: hDate,
            name: h.name,
            source: 'auto',
          });
        }
      }

      if (toCreate.length > 0) {
        await prisma.holiday.createMany({
          data: toCreate,
        });
      }
    } catch (err) {
      console.error('Failed to auto-import holidays during onboarding:', err);
    }

    return NextResponse.json({ message: 'Onboarding complete', semester }, { status: 201 });
  } catch (error: any) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { message: error?.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
