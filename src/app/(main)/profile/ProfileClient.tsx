'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { User, KeyRound, ShieldAlert, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

type ProfileClientProps = {
  user: {
    name: string;
    email: string;
    targetPercent: number;
    hasPassword: boolean; // false for Google-only accounts
  };
};

export default function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();

  // Target Attendance State
  const [targetPercent, setTargetPercent] = useState(user.targetPercent);
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSuccess, setTargetSuccess] = useState('');
  const [targetError, setTargetError] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Account Deletion State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Handle Target Update
  const handleTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTarget(true);
    setTargetSuccess('');
    setTargetError('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPercent: Number(targetPercent) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update target');

      setTargetSuccess(data.message);
      router.refresh();
    } catch (err: any) {
      setTargetError(err.message);
    } finally {
      setSavingTarget(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      setPasswordSuccess(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeletingAccount(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete account');

      // Logout and redirect to login page
      await signOut({ callbackUrl: '/login' });
    } catch (err: any) {
      setDeleteError(err.message);
      setDeletingAccount(false);
      setShowDeleteConfirmModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Info display */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold font-outfit text-indigo-900 flex items-center gap-2">
          <User size={18} className="text-indigo-600" />
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block font-medium text-slate-400">Name</span>
            <span className="block font-semibold text-slate-700 mt-1">{user.name}</span>
          </div>
          <div>
            <span className="block font-medium text-slate-400">Email Address (Read-only)</span>
            <span className="block font-semibold text-slate-700 mt-1">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Target Attendance Form */}
      <form onSubmit={handleTargetSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold font-outfit text-indigo-900 flex items-center gap-2">
          <ShieldAlert size={18} className="text-indigo-600" />
          Target Attendance
        </h3>

        {targetSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{targetSuccess}</span>
          </div>
        )}
        {targetError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{targetError}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Min. Target Attendance (%)</label>
            <span className="text-xl font-bold font-outfit text-indigo-900">{targetPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={targetPercent}
            onChange={(e) => setTargetPercent(Number(e.target.value))}
            className="w-full h-2 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <button
          type="submit"
          disabled={savingTarget}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {savingTarget ? 'Saving...' : 'Save Target Attendance'}
        </button>
      </form>

      {/* Change Password Form — only for accounts with a password */}
      {user.hasPassword ? (
        <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-bold font-outfit text-indigo-900 flex items-center gap-2">
            <KeyRound size={18} className="text-indigo-600" />
            Change Password
          </h3>

          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}
          {passwordError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password (min 8 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {changingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-xl shrink-0">
            <KeyRound size={18} className="text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Password not set</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              No password is associated with this account.
            </p>
          </div>
        </div>
      )}

      {/* Danger Zone: Delete Account */}
      <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold font-outfit text-red-800 flex items-center gap-2">
          <Trash2 size={18} />
          Danger Zone
        </h3>
        <p className="text-sm text-red-700/80 leading-relaxed">
          Deleting your account is permanent. All your semesters, subjects, slots, holidays, and logged attendance details will be permanently erased. This action cannot be undone.
        </p>

        {deleteError && (
          <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}

        <div className="space-y-3">
          <label htmlFor="deleteConfirm" className="block text-sm font-semibold text-red-800">
            Type <span className="underline select-none">DELETE</span> to confirm:
          </label>
          <input
            id="deleteConfirm"
            type="text"
            placeholder="DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none text-red-900 bg-white placeholder-red-300"
          />
        </div>

        <button
          type="button"
          disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
          onClick={() => setShowDeleteConfirmModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Trash2 size={16} />
          Delete Account
        </button>
      </div>

      {/* Second-step Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold font-outfit text-slate-900">Are you absolutely sure?</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  This will completely delete your account and clear all historical attendance files. You will not be able to recover this data.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                No, Keep Account
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {deletingAccount ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
