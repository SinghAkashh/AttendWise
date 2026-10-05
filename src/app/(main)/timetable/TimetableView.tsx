'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Clock, Edit3, Trash2, Plus, Grid3x3,
  LayoutList, CheckCircle2, ChevronRight, X,
  Sparkles, Layers, BookOpen, Filter
} from 'lucide-react';

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type TimetableSlotView = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: {
    id: string;
    name: string;
    colorTag: string;
  };
};

type Props = {
  slots: TimetableSlotView[];
  subjects: { id: string; name: string; colorTag: string }[];
  onOpenGridEditor: () => void;
};

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatDuration(start: string, end: string): string {
  const mins = timeToMins(end) - timeToMins(start);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m}m`;
}

export default function TimetableView({ slots: initialSlots, subjects, onOpenGridEditor }: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState<TimetableSlotView[]>(initialSlots);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  
  // Modal state for editing/adding a slot
  const [editingSlot, setEditingSlot] = useState<TimetableSlotView | null>(null);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [modalDay, setModalDay] = useState<number>(1);
  const [modalSubjectId, setModalSubjectId] = useState<string>(subjects[0]?.id || '');
  const [modalStart, setModalStart] = useState<string>('09:00');
  const [modalEnd, setModalEnd] = useState<string>('10:00');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Active days that have at least one slot
  const activeDays = useMemo(() => {
    const set = new Set<number>();
    slots.forEach(s => set.add(s.dayOfWeek));
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [1, 2, 3, 4, 5];
  }, [slots]);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return slots.filter(s => {
      if (selectedDayFilter !== 'all' && s.dayOfWeek !== selectedDayFilter) return false;
      if (subjectFilter !== 'all' && s.subject.id !== subjectFilter) return false;
      return true;
    });
  }, [slots, selectedDayFilter, subjectFilter]);

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const map: Record<number, TimetableSlotView[]> = {};
    for (let d = 1; d <= 6; d++) map[d] = [];
    slots.forEach(s => {
      if (map[s.dayOfWeek]) {
        map[s.dayOfWeek].push(s);
      }
    });
    for (let d = 1; d <= 6; d++) {
      map[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [slots]);

  // Statistics
  const stats = useMemo(() => {
    const totalClasses = slots.length;
    let totalMins = 0;
    slots.forEach(s => {
      const d = timeToMins(s.endTime) - timeToMins(s.startTime);
      if (d > 0) totalMins += d;
    });
    const hours = (totalMins / 60).toFixed(1);
    const uniqueSubjects = new Set(slots.map(s => s.subject.id)).size;
    return { totalClasses, hours, uniqueSubjects, daysCount: activeDays.length };
  }, [slots, activeDays]);

  // Open Edit Modal
  const openEditModal = (slot: TimetableSlotView) => {
    setEditingSlot(slot);
    setIsAddingSlot(false);
    setModalDay(slot.dayOfWeek);
    setModalSubjectId(slot.subject.id);
    setModalStart(slot.startTime);
    setModalEnd(slot.endTime);
    setModalError('');
  };

  // Open Add Modal
  const openAddModal = (defaultDay?: number) => {
    setEditingSlot(null);
    setIsAddingSlot(true);
    setModalDay(defaultDay || activeDays[0] || 1);
    setModalSubjectId(subjects[0]?.id || '');
    setModalStart('09:00');
    setModalEnd('10:00');
    setModalError('');
  };

  // Save Slot (Add or Update)
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    if (!modalSubjectId) {
      setModalError('Please select a subject');
      return;
    }
    if (timeToMins(modalEnd) <= timeToMins(modalStart)) {
      setModalError('End time must be after start time');
      return;
    }

    setModalLoading(true);
    try {
      if (editingSlot) {
        // Update existing slot via PATCH
        const res = await fetch(`/api/slots/${editingSlot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayOfWeek: modalDay,
            subjectId: modalSubjectId,
            startTime: modalStart,
            endTime: modalEnd,
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.message || 'Failed to update slot');
        }

        const data = await res.json();
        setSlots(prev => prev.map(s => s.id === editingSlot.id ? data.slot : s));
        setEditingSlot(null);
      } else {
        // Add new slot via POST
        const res = await fetch(`/api/subjects/${modalSubjectId}/slots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayOfWeek: modalDay,
            startTime: modalStart,
            endTime: modalEnd,
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.message || 'Failed to add slot');
        }

        const data = await res.json();
        const targetSubject = subjects.find(s => s.id === modalSubjectId)!;
        const newSlot: TimetableSlotView = {
          ...data.slot,
          subject: targetSubject,
        };
        setSlots(prev => [...prev, newSlot]);
        setIsAddingSlot(false);
      }
      router.refresh();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this class from your timetable?')) return;
    try {
      const res = await fetch(`/api/slots/${slotId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete slot');
      setSlots(prev => prev.filter(s => s.id !== slotId));
      if (editingSlot?.id === slotId) setEditingSlot(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Find all unique time bands across all days for the grid view
  const allTimeBands = useMemo(() => {
    const set = new Set<string>();
    slots.forEach(s => set.add(`${s.startTime}–${s.endTime}`));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [slots]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-outfit text-white">Your Weekly Timetable</h2>
            <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={12} /> Active
            </span>
          </div>
          <p className="text-sm text-indigo-200 mt-1">
            {stats.totalClasses} classes · {stats.hours} hrs/week across {stats.daysCount} active days
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/30 hover:bg-indigo-500/50 border border-indigo-400/40 rounded-xl text-xs font-semibold text-white transition-all shadow-sm"
          >
            <Plus size={15} /> Add Class
          </button>
          
          <button
            onClick={onOpenGridEditor}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-950 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all shadow-sm group"
          >
            <Edit3 size={15} className="text-indigo-600 group-hover:scale-110 transition-transform" />
            Edit in Grid Builder
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
          <div className="text-xs text-slate-500 font-medium">Total Classes</div>
          <div className="text-xl font-bold font-outfit text-slate-800 mt-0.5">{stats.totalClasses}</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
          <div className="text-xs text-slate-500 font-medium">Study Hours / Week</div>
          <div className="text-xl font-bold font-outfit text-indigo-600 mt-0.5">{stats.hours} hrs</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
          <div className="text-xs text-slate-500 font-medium">Subjects Scheduled</div>
          <div className="text-xl font-bold font-outfit text-slate-800 mt-0.5">{stats.uniqueSubjects}</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
          <div className="text-xs text-slate-500 font-medium">Schedule Days</div>
          <div className="text-xl font-bold font-outfit text-slate-800 mt-0.5">
            {activeDays.length > 0 ? `${DAY_SHORT[activeDays[0]]} – ${DAY_SHORT[activeDays[activeDays.length - 1]]}` : '—'}
          </div>
        </div>
      </div>

      {/* Controls: View layout toggle & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Layout toggle */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-indigo-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid3x3 size={14} /> Weekly Matrix
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'cards'
                ? 'bg-white text-indigo-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutList size={14} /> Day Cards
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Day Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setSelectedDayFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedDayFilter === 'all'
                  ? 'bg-white text-indigo-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Days
            </button>
            {activeDays.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDayFilter(d)}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  selectedDayFilter === d
                    ? 'bg-white text-indigo-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {DAY_SHORT[d]}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          {subjects.length > 0 && (
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ─── View 1: Weekly Matrix ────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24 border-r border-slate-100">
                  Day
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Classes Schedule
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(selectedDayFilter === 'all' ? activeDays : [selectedDayFilter as number]).map(day => {
                const daySlots = (slotsByDay[day] || []).filter(s =>
                  subjectFilter === 'all' || s.subject.id === subjectFilter
                );

                return (
                  <tr key={day} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-4 py-4 align-top border-r border-slate-100 bg-slate-50/30">
                      <div className="font-bold text-slate-900 font-outfit text-sm">
                        {DAY_SHORT[day]}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {daySlots.length} {daySlots.length === 1 ? 'class' : 'classes'}
                      </div>
                      <button
                        onClick={() => openAddModal(day)}
                        className="mt-2 text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-medium"
                      >
                        <Plus size={11} /> Add
                      </button>
                    </td>

                    <td className="px-4 py-3 align-top">
                      {daySlots.length === 0 ? (
                        <div className="py-3 text-xs text-slate-400 italic">
                          No classes scheduled for this day
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
                          {daySlots.map(slot => {
                            const durationStr = formatDuration(slot.startTime, slot.endTime);
                            const isLongClass = timeToMins(slot.endTime) - timeToMins(slot.startTime) > 75;

                            return (
                              <div
                                key={slot.id}
                                className="group relative rounded-xl border border-slate-200/80 bg-white p-3 hover:shadow-md transition-all min-w-[190px] max-w-[240px] flex-1 cursor-pointer"
                                style={{
                                  borderLeftWidth: '4px',
                                  borderLeftColor: slot.subject.colorTag,
                                }}
                                onClick={() => openEditModal(slot)}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="font-semibold text-slate-900 text-sm truncate" title={slot.subject.name}>
                                    {slot.subject.name}
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); openEditModal(slot); }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                      title="Edit class"
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                                      title="Delete class"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                  <div className="flex items-center gap-1 font-mono font-medium text-slate-700">
                                    <Clock size={12} className="text-slate-400" />
                                    {slot.startTime} – {slot.endTime}
                                  </div>
                                  {durationStr && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      isLongClass ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {durationStr}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── View 2: Day Cards ────────────────────────────────────────────── */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(selectedDayFilter === 'all' ? activeDays : [selectedDayFilter as number]).map(day => {
            const daySlots = (slotsByDay[day] || []).filter(s =>
              subjectFilter === 'all' || s.subject.id === subjectFilter
            );

            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
                {/* Day Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-outfit">{DAYS[day]}</span>
                    <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {daySlots.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openAddModal(day)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                {/* Day Slots List */}
                <div className="p-3 space-y-2.5 flex-1">
                  {daySlots.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      No classes on {DAYS[day]}
                    </div>
                  ) : (
                    daySlots.map(slot => {
                      const durationStr = formatDuration(slot.startTime, slot.endTime);
                      return (
                        <div
                          key={slot.id}
                          onClick={() => openEditModal(slot)}
                          className="group relative rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 p-3 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2.5 h-10 rounded-full shrink-0"
                              style={{ backgroundColor: slot.subject.colorTag }}
                            />
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">
                                {slot.subject.name}
                              </div>
                              <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{slot.startTime} – {slot.endTime}</span>
                                {durationStr && (
                                  <span className="text-[10px] text-slate-400">({durationStr})</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openEditModal(slot); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                              title="Edit class"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              title="Delete class"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal: Edit / Add Slot ────────────────────────────────────────── */}
      {(editingSlot || isAddingSlot) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  {editingSlot ? <Edit3 size={16} /> : <Plus size={16} />}
                </div>
                <h3 className="font-bold text-slate-900 font-outfit text-base">
                  {editingSlot ? 'Edit Timetable Slot' : 'Add Class Slot'}
                </h3>
              </div>
              <button
                onClick={() => { setEditingSlot(null); setIsAddingSlot(false); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                  {modalError}
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject
                </label>
                <select
                  value={modalSubjectId}
                  onChange={e => setModalSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  required
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Day of Week */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Day of Week
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setModalDay(d)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        modalDay === d
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {DAY_SHORT[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={modalStart}
                    onChange={e => setModalStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={modalEnd}
                    onChange={e => setModalEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Computed duration preview */}
              <div className="text-xs text-slate-500 flex items-center justify-between px-1">
                <span>Duration:</span>
                <span className="font-semibold text-indigo-700">
                  {formatDuration(modalStart, modalEnd) || 'Invalid duration'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingSlot ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(editingSlot.id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} /> Delete Class
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingSlot(null); setIsAddingSlot(false); }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {modalLoading ? 'Saving…' : editingSlot ? 'Update Slot' : 'Add Slot'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
