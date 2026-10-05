'use client';

import { useState, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Ban, CheckCheck, RotateCcw } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type TimetableSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Subject = {
  id: string;
  name: string;
  colorTag: string;
  timetableSlots: TimetableSlot[];
};

type AttendanceStatus = 'present' | 'absent' | 'cancelled';

type DailySlot = TimetableSlot & { subject: Subject; slotCount?: number };

// Toast tracks one pending undo action
type UndoToast = {
  id: number;
  label: string;
  subjectId: string;
  prevStatus: AttendanceStatus | undefined; // undefined = no log existed before
  dateKey: string;
};

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  cancelled: 'Cancelled',
};

export default function DailyTracker({ subjects }: { subjects: Subject[] }) {
  const [viewDate, setViewDate] = useState<Date>(getToday());
  const [logs, setLogs] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef(0);

  const dateKey = formatDateKey(viewDate);
  const dayOfWeek = viewDate.getDay();
  const isToday = formatDateKey(viewDate) === formatDateKey(getToday());

  const todaysSlots: DailySlot[] = subjects
    .flatMap(subject =>
      subject.timetableSlots
        .filter(slot => slot.dayOfWeek === dayOfWeek)
        .map(slot => ({ ...slot, subject }))
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Deduplicate by subjectId and aggregate time info
  const subjectSlotMap = new Map<string, { slot: DailySlot; allSlots: DailySlot[] }>();
  for (const slot of todaysSlots) {
    const existing = subjectSlotMap.get(slot.subject.id);
    if (existing) {
      existing.allSlots.push(slot);
    } else {
      subjectSlotMap.set(slot.subject.id, { slot, allSlots: [slot] });
    }
  }
  const uniqueSlots = Array.from(subjectSlotMap.values()).map(({ slot, allSlots }) => {
    // Compute the full time range (earliest start to latest end)
    const earliestStart = allSlots.reduce((min, s) => s.startTime < min ? s.startTime : min, allSlots[0].startTime);
    const latestEnd = allSlots.reduce((max, s) => s.endTime > max ? s.endTime : max, allSlots[0].endTime);
    return { ...slot, startTime: earliestStart, endTime: latestEnd, slotCount: allSlots.length };
  });

  // Fetch existing logs for the viewed date
  useEffect(() => {
    async function fetchLogs() {
      const res = await fetch(`/api/attendance?date=${dateKey}`);
      if (res.ok) {
        const data = await res.json();
        const logMap: Record<string, AttendanceStatus> = {};
        for (const log of data.logs) {
          logMap[log.subjectId] = log.status;
        }
        setLogs(logMap);
      }
    }
    fetchLogs();
    // Clear any dangling toast when navigating days
    clearToast();
  }, [dateKey]);

  // Dismiss toast helper
  const clearToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  // Show a new undo toast, replacing any existing one
  const showToast = (newToast: UndoToast) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(newToast);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  // Mark a single subject — saves previous status for Undo
  const handleMark = async (
    subjectId: string,
    status: AttendanceStatus,
    opts: { showUndo?: boolean } = {}
  ) => {
    const prevStatus = logs[subjectId]; // undefined if no log yet
    setSaving(subjectId);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, date: dateKey, status }),
      });
      if (res.ok) {
        setLogs(prev => ({ ...prev, [subjectId]: status }));

        if (opts.showUndo !== false) {
          const subject = subjects.find(s => s.id === subjectId);
          const toastId = ++toastIdRef.current;
          showToast({
            id: toastId,
            label: `Marked ${subject?.name ?? ''} ${STATUS_LABELS[status]}`,
            subjectId,
            prevStatus,
            dateKey,
          });
        }
      }
    } finally {
      setSaving(null);
    }
  };

  // Undo: revert to previous state (or delete if no previous state existed)
  const handleUndo = async () => {
    if (!toast) return;
    const { subjectId, prevStatus, dateKey: toastDateKey } = toast;
    clearToast();

    if (prevStatus === undefined) {
      // No log existed before — delete it
      await fetch('/api/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, date: toastDateKey }),
      });
      setLogs(prev => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
    } else {
      // Restore previous status — don't show another undo toast for this
      await handleMark(subjectId, prevStatus, { showUndo: false });
    }
  };

  // Bulk mark all unmarked slots as Present (skips already-logged ones)
  const handleMarkAllPresent = async () => {
    const unmarkedIds = uniqueSlots
      .map(s => s.subject.id)
      .filter(id => !logs[id]);

    if (unmarkedIds.length === 0) return;

    setMarkingAll(true);
    try {
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateKey, subjectIds: unmarkedIds }),
      });
      if (res.ok) {
        setLogs(prev => {
          const next = { ...prev };
          for (const id of unmarkedIds) next[id] = 'present';
          return next;
        });
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const shiftDay = (delta: number) => {
    const next = new Date(viewDate);
    next.setDate(next.getDate() + delta);
    setViewDate(next);
  };

  const unmarkedCount = uniqueSlots.filter(s => !logs[s.subject.id]).length;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold font-outfit text-indigo-900 flex items-center gap-2">
            <CalendarDays className="text-indigo-600" size={22} />
            {isToday ? "Today's Classes" : DAYS[dayOfWeek]}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftDay(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setViewDate(getToday())}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${isToday ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              Today
            </button>
            <button
              onClick={() => shiftDay(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4 -mt-3">{formatDisplayDate(viewDate)}</p>

        {/* Mark All Present button — only shown when there are unmarked slots */}
        {uniqueSlots.length > 0 && unmarkedCount > 0 && (
          <div className="mb-3">
            <button
              onClick={handleMarkAllPresent}
              disabled={markingAll}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <CheckCheck size={16} />
              {markingAll ? 'Marking…' : `Mark all Present (${unmarkedCount} unmarked)`}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {uniqueSlots.length === 0 ? (
            <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-500">No classes on {DAYS[dayOfWeek]}.</p>
            </div>
          ) : (
            uniqueSlots.map(slot => {
              const status = logs[slot.subject.id];
              const isSaving = saving === slot.subject.id;

              return (
                <div key={slot.id} className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  {/* Color strip */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: slot.subject.colorTag }}
                  />
                  <div className="pl-5 pr-3 py-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{slot.subject.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>{slot.startTime} – {slot.endTime}</span>
                        {slot.slotCount > 1 && (
                          <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded">
                            {slot.slotCount} periods
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Status Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        disabled={isSaving}
                        onClick={() => handleMark(slot.subject.id, 'present')}
                        title="Present"
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${status === 'present' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                      >
                        <CheckCircle2 size={14} />
                        {status === 'present' ? '✓' : 'P'}
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={() => handleMark(slot.subject.id, 'absent')}
                        title="Absent"
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${status === 'absent' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}
                      >
                        <XCircle size={14} />
                        {status === 'absent' ? '✓' : 'A'}
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={() => handleMark(slot.subject.id, 'cancelled')}
                        title="Cancelled"
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${status === 'cancelled' ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'}`}
                      >
                        <Ban size={14} />
                        {status === 'cancelled' ? '✓' : 'C'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Undo Toast — fixed bottom-center, auto-dismisses after 4.5 s */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-slate-800 text-white rounded-2xl shadow-xl text-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="font-medium">{toast.label}</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-semibold transition-colors"
          >
            <RotateCcw size={12} />
            Undo
          </button>
          <button
            onClick={clearToast}
            className="text-white/50 hover:text-white transition-colors text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
