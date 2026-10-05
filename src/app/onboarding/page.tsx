import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import OnboardingClient from './OnboardingClient';
import Link from 'next/link';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;

  const semester = await prisma.semester.findFirst({
    where: { userId },
  });

  if (semester) {
    // Already onboarded
    redirect('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Minimal header with escape hatch */}
      <div className="flex justify-between items-center px-6 py-4">
        <span className="font-outfit font-bold text-indigo-900 text-lg">AttendWise</span>
        <Link
          href="/api/auth/signout"
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Sign out
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-outfit text-indigo-900 mb-2">Welcome to AttendWise!</h1>
            <p className="text-slate-500">Let&apos;s set up your semester so you can start planning.</p>
          </div>
          <OnboardingClient />
        </div>
      </div>
    </div>
  );
}
