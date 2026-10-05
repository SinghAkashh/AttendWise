import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import BackfillClient from './BackfillClient';
import Link from 'next/link';

export default async function BackfillPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as { id: string }).id;

  const semester = await prisma.semester.findFirst({
    where: { userId },
  });

  if (!semester) {
    // If they haven't set up a semester, go to normal onboarding
    redirect('/onboarding');
  }

  const subjects = await prisma.subject.findMany({
    where: { semesterId: semester.id },
    orderBy: { name: 'asc' },
  });

  if (subjects.length === 0) {
    // Should have subjects created from timetable
    redirect('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex justify-between items-center px-6 py-4">
        <span className="font-outfit font-bold text-indigo-900 text-lg">AttendWise</span>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Skip, I&apos;m starting fresh
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-outfit text-indigo-900 mb-2">Backfill Attendance</h1>
            <p className="text-slate-500">
              Started using AttendWise mid-semester? Enter your current attendance for each subject.
            </p>
          </div>
          <BackfillClient initialSubjects={subjects} />
        </div>
      </div>
    </div>
  );
}
