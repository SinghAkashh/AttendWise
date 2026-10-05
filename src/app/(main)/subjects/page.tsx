import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SubjectsClient from './SubjectsClient';
import Link from 'next/link';
import { Grid3x3, ArrowRight } from 'lucide-react';

import { redirect } from 'next/navigation';

export default async function SubjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const userId = (session.user as any).id;

  const semester = await prisma.semester.findFirst({
    where: { userId },
  });

  const subjects = await prisma.subject.findMany({
    where: { semesterId: semester?.id },
    include: { timetableSlots: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-indigo-900">Subjects</h1>
          <p className="text-slate-500 mt-1">Manage subjects and per-slot overrides.</p>
        </div>
      </div>

      {/* Promote the grid builder */}
      <Link
        href="/timetable"
        className="flex items-center justify-between p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Grid3x3 size={20} />
          </div>
          <div>
            <p className="font-semibold font-outfit">Open Timetable Builder</p>
            <p className="text-xs text-indigo-200 mt-0.5">Faster setup — fill an entire week&apos;s grid at once</p>
          </div>
        </div>
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* Backfill link */}
      <Link
        href="/onboarding/backfill"
        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-2xl transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
          </div>
          <div>
            <p className="font-semibold font-outfit">Backfill Past Attendance</p>
            <p className="text-xs text-slate-500 mt-0.5">Started using the app mid-semester? Add your past records here.</p>
          </div>
        </div>
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform text-slate-400" />
      </Link>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">or manage slots individually below</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <SubjectsClient initialSubjects={subjects} />
    </div>
  );
}
