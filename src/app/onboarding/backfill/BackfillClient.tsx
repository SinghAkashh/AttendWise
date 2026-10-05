'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Subject = {
  id: string;
  name: string;
  colorTag: string;
  baselineAttended: number;
  baselineHeld: number;
};

export default function BackfillClient({ initialSubjects }: { initialSubjects: Subject[] }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState(
    initialSubjects.map((s) => ({
      ...s,
      baselineAttended: s.baselineAttended || 0,
      baselineHeld: s.baselineHeld || 0,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateSubject = (id: string, field: 'baselineAttended' | 'baselineHeld', value: string) => {
    const num = parseInt(value) || 0;
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newObj = { ...s, [field]: Math.max(0, num) };
        // Ensure attended <= held automatically, or let the user fix it. Let's just store what they type
        // and validate on submit/blur to prevent jumping.
        return newObj;
      })
    );
  };

  const validate = () => {
    for (const s of subjects) {
      if (s.baselineAttended > s.baselineHeld) {
        return `Attended cannot exceed Held for ${s.name}`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/subjects/backfill', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects }),
      });

      if (!res.ok) {
        throw new Error('Failed to save backfill data');
      }

      router.push('/');
      router.refresh();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred');
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-sm font-semibold text-slate-700">Subject</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700 w-32">Total Conducted</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-700 w-32">Attended</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s, idx) => (
              <tr key={s.id} className={idx !== subjects.length - 1 ? 'border-b border-slate-100' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.colorTag }} />
                    <span className="font-medium text-slate-800">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    value={s.baselineHeld || ''}
                    onChange={(e) => updateSubject(s.id, 'baselineHeld', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    max={s.baselineHeld}
                    value={s.baselineAttended || ''}
                    onChange={(e) => updateSubject(s.id, 'baselineAttended', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <button
          onClick={() => { router.push('/'); router.refresh(); }}
          className="px-6 py-2.5 text-slate-500 hover:bg-slate-100 font-medium rounded-xl transition-colors"
        >
          Skip, starting fresh
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-8 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
