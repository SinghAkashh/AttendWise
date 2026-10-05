import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TimetableContainer from './TimetableContainer';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Weekly Timetable — AttendWise',
  description: 'View and manage your weekly class timetable and schedule.',
};

export default async function TimetablePage({
  searchParams,
}: {
  searchParams?: { onboarding?: string; mode?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const userId = (session.user as any).id;

  const semester = await prisma.semester.findFirst({ where: { userId } });

  const subjects = semester
    ? await prisma.subject.findMany({
        where: { semesterId: semester.id },
        include: {
          timetableSlots: {
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  const hasSlots = subjects.some(s => s.timetableSlots.length > 0);
  const isOnboarding = searchParams?.onboarding === 'true';
  const initialMode: 'view' | 'grid' =
    searchParams?.mode === 'grid' || isOnboarding || !hasSlots ? 'grid' : 'view';

  return (
    <TimetableContainer
      subjects={subjects}
      initialMode={initialMode}
    />
  );
}
