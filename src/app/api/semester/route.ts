import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import publicHolidays from '@/data/holidays-in.json';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Fetch the user's semester — IDOR: scoped strictly to this user
    const semester = await prisma.semester.findFirst({ where: { userId } });
    if (!semester) return NextResponse.json({ message: 'Semester not found' }, { status: 404 });

    const body = await req.json();
    const { startDate, endDate, country, workingSaturdays } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ message: 'startDate and endDate are required' }, { status: 400 });
    }

    // Parse input dates as UTC midnight (timezone-agnostic, consistent with all other date handling)
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const newStart = new Date(Date.UTC(sy, sm - 1, sd));
    const newEnd   = new Date(Date.UTC(ey, em - 1, ed));

    // Validation
    if (newEnd <= newStart) {
      return NextResponse.json({ message: 'End date must be after start date' }, { status: 400 });
    }

    const now = new Date();
    const endIsInPast = newEnd < now;

    // Update the semester dates + settings
    await prisma.semester.update({
      where: { id: semester.id },
      data: {
        startDate: newStart,
        endDate: newEnd,
        country: country ?? semester.country,
        workingSaturdays: workingSaturdays ?? semester.workingSaturdays,
      },
    });

    // --- Holiday reconciliation ---
    // Only touch auto holidays; never modify manual ones.

    const existingHolidays = await prisma.holiday.findMany({
      where: { semesterId: semester.id },
    });

    // Helper: format a Date as YYYY-MM-DD using UTC parts
    const toDateKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // 1. Remove auto holidays now outside the new range
    const autoToRemove = existingHolidays.filter(h => {
      if (h.source !== 'auto') return false;
      const hDate = new Date(h.date);
      return hDate < newStart || hDate > newEnd;
    });
    if (autoToRemove.length > 0) {
      await prisma.holiday.deleteMany({
        where: { id: { in: autoToRemove.map(h => h.id) } },
      });
    }

    // 2. Import newly in-range auto holidays, skipping dates that already have any holiday
    const remainingHolidayKeys = new Set(
      existingHolidays
        .filter(h => !autoToRemove.some(r => r.id === h.id))
        .map(h => toDateKey(new Date(h.date)))
    );

    const toAdd = [];
    for (const h of publicHolidays) {
      const [year, month, day] = h.date.split('-').map(Number);
      const hDate = new Date(Date.UTC(year, month - 1, day));
      const dateKey = toDateKey(hDate);

      if (hDate >= newStart && hDate <= newEnd && !remainingHolidayKeys.has(dateKey)) {
        toAdd.push({
          semesterId: semester.id,
          date: hDate,
          name: h.name,
          source: 'auto',
        });
      }
    }
    if (toAdd.length > 0) {
      await prisma.holiday.createMany({ data: toAdd });
    }

    // Build a human-readable summary of downstream effects
    // NOTE: getRemainingClasses() reads semester.startDate/endDate live on every call,
    //       so remaining-class calculations automatically reflect the new dates — no extra action needed.
    const summaryParts: string[] = [];
    if (autoToRemove.length > 0) summaryParts.push(`${autoToRemove.length} holiday${autoToRemove.length > 1 ? 's' : ''} removed`);
    if (toAdd.length > 0) summaryParts.push(`${toAdd.length} holiday${toAdd.length > 1 ? 's' : ''} added`);
    summaryParts.push('remaining classes recalculated');

    return NextResponse.json({
      message: `Semester updated. ${summaryParts.join(', ')}.`,
      endIsInPast,
      holidaysRemoved: autoToRemove.length,
      holidaysAdded: toAdd.length,
    });
  } catch (error: any) {
    console.error('Semester update error:', error);
    return NextResponse.json({ message: error?.message || 'Something went wrong' }, { status: 500 });
  }
}
