import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import LogsClient from './LogsClient';

export default async function SubjectLogsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const userId = (session.user as { id: string }).id;

  const subject = await prisma.subject.findUnique({
    where: { id: params.id },
    include: {
      semester: true,
      attendanceLogs: {
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!subject || subject.semester.userId !== userId) {
    redirect('/subjects');
  }

  // Convert dates to string for serialization to Client Components
  const serializedSubject = {
    ...subject,
    attendanceLogs: subject.attendanceLogs.map((log) => ({
      ...log,
      date: log.date.toISOString(),
    })),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-slate-800">
            Manage Logged Days
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {subject.name} • {subject.attendanceLogs.length} logged {subject.attendanceLogs.length === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>

      <LogsClient subject={serializedSubject} />
    </div>
  );
}
