import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export const metadata = {
  title: 'Profile Settings — AttendWise',
  description: 'Manage your account settings, target attendance, and passwords.',
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      targetPercent: true,
      passwordHash: true, // used to gate the Change Password section
    },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-outfit text-indigo-900">Profile Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account information, target attendance, and security.</p>
      </div>

      <div className="max-w-xl">
        <ProfileClient
          user={{
            name: user.name || 'User',
            email: user.email,
            targetPercent: user.targetPercent,
            hasPassword: !!user.passwordHash,
          }}
        />
      </div>
    </div>
  );
}
