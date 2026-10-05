'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function OnboardingClient() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [country, setCountry] = useState('US');
  const [workingSaturdays, setWorkingSaturdays] = useState(false);
  const [targetPercent, setTargetPercent] = useState('75');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          country,
          workingSaturdays,
          targetPercent: parseFloat(targetPercent),
        }),
      });

      if (res.status === 401) {
        // Stale JWT — sign out and redirect to login
        await signOut({ callbackUrl: '/login' });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Something went wrong');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-2 text-xs font-medium text-red-500 underline hover:text-red-700"
          >
            Sign out and try a different account
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
          <input 
            type="date" 
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
          <input 
            type="date" 
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="US">United States</option>
          <option value="IN">India</option>
          <option value="UK">United Kingdom</option>
          <option value="CA">Canada</option>
          <option value="AU">Australia</option>
          {/* Add more as needed */}
        </select>
      </div>

      <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
        <input 
          type="checkbox"
          id="workingSaturdays"
          checked={workingSaturdays}
          onChange={(e) => setWorkingSaturdays(e.target.checked)}
          className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
        />
        <label htmlFor="workingSaturdays" className="text-sm font-medium text-slate-700">
          Count Saturdays as working days?
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Target Attendance (%)</label>
        <div className="flex items-center gap-4">
          <input 
            type="range"
            min="0"
            max="100"
            value={targetPercent}
            onChange={(e) => setTargetPercent(e.target.value)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-lg font-semibold font-outfit text-indigo-900 w-12">{targetPercent}%</span>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Complete Setup'}
      </button>
    </form>
  );
}
