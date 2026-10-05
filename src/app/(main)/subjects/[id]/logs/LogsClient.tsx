'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, AlertTriangle, Calendar, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

type AttendanceLogItem = {
  id: string;
  subjectId: string;
  date: string;
  status: string;
};

type SerializedSubject = {
  id: string;
  name: string;
  colorTag: string;
  baselineAttended: number;
  baselineHeld: number;
  attendanceLogs: AttendanceLogItem[];
};

export default function LogsClient({ subject }: { subject: SerializedSubject }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSingleDelete = async (log: AttendanceLogItem) => {
    setDeletingId(log.id);
    setError(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: log.subjectId,
          date: log.date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete log');
      }

      router.refresh();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An error occurred while deleting');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subjects/${subject.id}/logs`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to clear logs');
      }

      setShowClearConfirm(false);
      router.refresh();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An error occurred while clearing logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={14} /> Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={14} /> Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <MinusCircle size={14} /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {subject.attendanceLogs.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
          >
            <Trash2 size={14} /> Clear all logged days
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Confirmation Modal / Banner for Clear All */}
      {showClearConfirm && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-900">
                Clear all logged days for {subject.name}?
              </h4>
              <p className="text-xs text-red-700">
                This will delete all <strong>{subject.attendanceLogs.length}</strong> logged days for{' '}
                <strong>{subject.name}</strong>. Your backfilled baseline ({subject.baselineAttended}/
                {subject.baselineHeld}) will not be affected. Continue?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end pt-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Clearing...' : 'Yes, clear all'}
            </button>
          </div>
        </div>
      )}

      {/* Table / List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {subject.attendanceLogs.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">No logged days found for this subject.</p>
            {subject.baselineHeld > 0 && (
              <p className="text-xs text-slate-400">
                Baseline data ({subject.baselineAttended}/{subject.baselineHeld}) is active, but no day-by-day logs exist yet.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subject.attendanceLogs.map((log) => {
                  const dateObj = new Date(log.date);
                  const formattedDate = dateObj.toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleSingleDelete(log)}
                          disabled={deletingId === log.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
