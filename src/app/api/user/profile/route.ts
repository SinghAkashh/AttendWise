import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { targetPercent } = await req.json();
    if (targetPercent === undefined || typeof targetPercent !== 'number' || targetPercent < 0 || targetPercent > 100) {
      return NextResponse.json({ message: 'Invalid target percentage. Must be a number between 0 and 100.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { targetPercent },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        targetPercent: updatedUser.targetPercent,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ message: error?.message || 'Error updating profile' }, { status: 500 });
  }
}
