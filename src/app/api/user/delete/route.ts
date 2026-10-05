import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // Delete the user from the database.
    // Due to 'onDelete: Cascade' configured on semesters relation (and subsequently subjects, slots, holidays, logs),
    // this single deletion will cleanly cascade and clear all user data from the database.
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ message: error?.message || 'Error deleting account' }, { status: 500 });
  }
}
