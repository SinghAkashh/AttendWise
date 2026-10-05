import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import publicHolidays from '@/data/holidays-in.json';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const semester = await prisma.semester.findFirst({ where: { userId } });
    if (!semester) return NextResponse.json({ message: 'Semester not found' }, { status: 404 });

    // Fetch existing holidays to prevent duplicate imports on the same date
    const existingHolidays = await prisma.holiday.findMany({
      where: { semesterId: semester.id },
    });

    const existingDates = new Set(
      existingHolidays.map(h => {
        const d = new Date(h.date);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      })
    );

    // Normalize semester dates to UTC midnight
    const startVal = new Date(semester.startDate);
    const endVal = new Date(semester.endDate);
    const startUTC = new Date(Date.UTC(startVal.getUTCFullYear(), startVal.getUTCMonth(), startVal.getUTCDate()));
    const endUTC = new Date(Date.UTC(endVal.getUTCFullYear(), endVal.getUTCMonth(), endVal.getUTCDate()));

    const toCreate = [];
    for (const h of publicHolidays) {
      const [year, month, day] = h.date.split('-').map(Number);
      const hDate = new Date(Date.UTC(year, month - 1, day));
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Check if it is within range and not already present
      if (hDate >= startUTC && hDate <= endUTC && !existingDates.has(dateKey)) {
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

    return NextResponse.json({
      message: 'Holidays imported successfully',
      importedCount: toCreate.length,
    });
  } catch (error: any) {
    console.error('Manual import error:', error);
    return NextResponse.json({ message: error?.message || 'Error importing holidays' }, { status: 500 });
  }
}
