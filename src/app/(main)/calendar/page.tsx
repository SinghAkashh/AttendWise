import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CalendarClient from './CalendarClient';

import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Holiday Calendar — AttendWise',
  description: 'Manage manual and automatic holidays for your semester.',
};

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const userId = (session.user as any).id;

  const semester = await prisma.semester.findFirst({
    where: { userId },
  });

  const holidays = semester
    ? await prisma.holiday.findMany({
        where: { semesterId: semester.id },
      })
    : [];

  // Pass active semester start/end dates so the calendar can visual constraint them
  const semesterDates = semester
    ? {
        startDate: semester.startDate.toISOString(),
        endDate: semester.endDate.toISOString(),
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-outfit text-indigo-900">Holiday Calendar</h1>
        <p className="text-slate-500 mt-1">
          Mark manual holidays (study prep, events) to keep your remaining classes count accurate.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <CalendarClient
          initialHolidays={holidays.map(h => ({
            id: h.id,
            date: h.date.toISOString(),
            name: h.name,
            source: h.source as 'auto' | 'manual',
          }))}
          semesterDates={semesterDates}
        />
      </div>
    </div>
  );
}
