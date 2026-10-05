'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TimetableView, { TimetableSlotView } from './TimetableView';
import TimetableGrid from './TimetableGrid';
import { Calendar, Grid3x3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type SubjectWithSlots = {
  id: string;
  name: string;
  colorTag: string;
  timetableSlots: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
};

type Props = {
  subjects: SubjectWithSlots[];
  initialMode: 'view' | 'grid';
};

export default function TimetableContainer({ subjects, initialMode }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'grid'>(initialMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Flatten all slots with subject info attached
  const allSlots: TimetableSlotView[] = subjects.flatMap(sub =>
    sub.timetableSlots.map(slot => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject: {
        id: sub.id,
        name: sub.name,
        colorTag: sub.colorTag,
      },
    }))
  ).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  const hasSlots = allSlots.length > 0;
  // During SSR and first hydration, activeMode strictly matches initialMode
  const activeMode = mounted ? mode : initialMode;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-indigo-900">
            {activeMode === 'view' ? 'Timetable' : 'Timetable Builder'}
          </h1>
          <p className="text-slate-500 mt-1">
            {activeMode === 'view'
              ? 'View your weekly schedule, edit classes, or open the full grid builder.'
              : 'Configure your weekly schedule then fill in subjects for each period.'}
          </p>
        </div>

        {/* View / Grid Switcher Tabs (shown when slots exist) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasSlots && (
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setMode('view')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMode === 'view'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={14} /> View Schedule
              </button>
              <button
                onClick={() => setMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMode === 'grid'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid3x3 size={14} /> Edit in Grid
              </button>
            </div>
          )}

          <Link
            href="/subjects"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1"
          >
            <ArrowLeft size={13} />
            Subjects
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      {activeMode === 'view' && hasSlots ? (
        <TimetableView
          slots={allSlots}
          subjects={subjects.map(s => ({ id: s.id, name: s.name, colorTag: s.colorTag }))}
          onOpenGridEditor={() => setMode('grid')}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <TimetableGrid
            existingSubjects={subjects.map(s => ({ id: s.id, name: s.name, colorTag: s.colorTag }))}
            initialSlots={allSlots}
            onBackToView={hasSlots ? () => setMode('view') : undefined}
          />
        </div>
      )}
    </div>
  );
}
