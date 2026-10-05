'use client';

import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

type SemesterInfo = {
  startDate: string; // ISO string
  endDate: string;   // ISO string
  country: string;
  workingSaturdays: boolean;
};

type EditSemesterModalProps = {
  semester: SemesterInfo;
};

/**
 * Converts an ISO datetime string (e.g. "2026-08-01T00:00:00.000Z")
 * to the YYYY-MM-DD format required by <input type="date">.
 * Uses UTC methods so IST (+5:30) never causes an off-by-one date.
 */
function toInputDate(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const y  = d.getUTCFullYear();
    const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  } catch {
    return '';
  }
}

export default function EditSemesterModal({ semester }: EditSemesterModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Gear icon trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Edit semester settings"
        className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-700/50 transition-colors"
      >
        <Settings size={16} />
      </button>

      {/* Modal overlay — only in DOM when open */}
      {open && (
        <EditSemesterForm semester={semester} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

type EditSemesterFormProps = {
  semester: SemesterInfo;
  onClose: () => void;
};

function EditSemesterForm({ semester, onClose }: EditSemesterFormProps) {
  const router = useRouter();

  // Initialize state directly from props. Because this component is only mounted
  // when the modal is open, these state values are guaranteed to be set
  // instantly from current props upon mount (no blank render flashes).
  const [startDate, setStartDate] = useState(() => toInputDate(semester.startDate));
  const [endDate, setEndDate]     = useState(() => toInputDate(semester.endDate));
  const [country, setCountry]     = useState(semester.country);
  const [workingSaturdays, setWorkingSaturdays] = useState(semester.workingSaturdays);

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [pastWarning, setPastWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setPastWarning(false);

    // Client-side validation
    if (!startDate || !endDate) {
      setError('Both dates are required.');
      return;
    }
    if (endDate <= startDate) {
      setError('End date must be after start date.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/semester', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, country, workingSaturdays }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Update failed');
      }

      setSuccessMsg(data.message);
      if (data.endIsInPast) setPastWarning(true);

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-outfit text-indigo-900">Edit Semester</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {successMsg ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
              <div className="space-y-1.5">
                <p className="font-semibold">{successMsg}</p>
                {pastWarning && (
                  <p className="text-amber-600 flex items-center gap-1.5 text-xs">
                    <AlertTriangle size={13} className="shrink-0" />
                    End date is in the past — remaining classes will show 0.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertTriangle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                </select>
              </div>

              {/* Working Saturdays */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <input
                  type="checkbox"
                  id="editWorkingSaturdays"
                  checked={workingSaturdays}
                  onChange={e => setWorkingSaturdays(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="editWorkingSaturdays" className="text-sm font-medium text-slate-700">
                  Count Saturdays as working days
                </label>
              </div>

              {/* Info note */}
              <p className="text-xs text-slate-400 leading-relaxed">
                Public holidays are adjusted for the new date range automatically. Manual holidays and attendance logs are never changed.
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
