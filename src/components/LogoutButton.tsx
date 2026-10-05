'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm font-medium text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5"
      title="Sign out of your account"
    >
      <LogOut size={15} />
      <span>Logout</span>
    </button>
  );
}
