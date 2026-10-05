import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;

  const semester = await prisma.semester.findFirst({
    where: { userId },
  });

  if (!semester) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-outfit font-bold text-xl text-indigo-900">
            AttendWise
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">Dashboard</Link>
            <Link href="/timetable" className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">Timetable</Link>
            <Link href="/subjects" className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">Subjects</Link>
            <Link href="/calendar" className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">Calendar</Link>
            <Link href="/profile" className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">Profile</Link>
            <LogoutButton />
          </nav>

        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-4">
        {children}
      </main>
    </div>
  );
}
