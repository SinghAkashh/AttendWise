'use client';

import { useState } from 'react';
import { Plus, Trash2, Clock, CalendarDays } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Slot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Subject = {
  id: string;
  name: string;
  colorTag: string;
  timetableSlots: Slot[];
};

export default function SubjectsClient({ initialSubjects }: { initialSubjects: Subject[] }) {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  
  // Subject Form State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6366f1'); // Default indigo
  
  // Slot Form State
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [newSlotDay, setNewSlotDay] = useState<string>('1');
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('10:00');

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName) return;

    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubjectName, colorTag: newSubjectColor }),
    });

    if (res.ok) {
      const data = await res.json();
      setSubjects([...subjects, { ...data.subject, timetableSlots: [] }]);
      setNewSubjectName('');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure? This will delete all slots and attendance records for this subject.')) return;
    
    const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSubjects(subjects.filter(s => s.id !== id));
      if (activeSubject === id) setActiveSubject(null);
    }
  };

  const handleAddSlot = async (e: React.FormEvent, subjectId: string) => {
    e.preventDefault();
    const res = await fetch(`/api/subjects/${subjectId}/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayOfWeek: parseInt(newSlotDay),
        startTime: newSlotStart,
        endTime: newSlotEnd,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setSubjects(subjects.map(s => {
        if (s.id === subjectId) {
          return { ...s, timetableSlots: [...s.timetableSlots, data.slot] };
        }
        return s;
      }));
    }
  };

  const handleDeleteSlot = async (subjectId: string, slotId: string) => {
    const res = await fetch(`/api/slots/${slotId}`, { method: 'DELETE' });
    if (res.ok) {
      setSubjects(subjects.map(s => {
        if (s.id === subjectId) {
          return { ...s, timetableSlots: s.timetableSlots.filter(slot => slot.id !== slotId) };
        }
        return s;
      }));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Subjects List */}
      <div className="lg:col-span-1 space-y-4">
        <form onSubmit={handleAddSubject} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
          <input
            type="color"
            value={newSubjectColor}
            onChange={(e) => setNewSubjectColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
          />
          <input
            type="text"
            placeholder="New Subject Name"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
          />
          <button type="submit" className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Plus size={20} />
          </button>
        </form>

        <div className="space-y-2">
          {subjects.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500">Ready to start? Let&apos;s add your first subject!</p>
            </div>
          ) : (
            subjects.map(subject => (
              <div 
                key={subject.id} 
                onClick={() => setActiveSubject(subject.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${activeSubject === subject.id ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-slate-100 bg-white hover:border-indigo-300'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.colorTag }} />
                    <span className="font-medium text-slate-900">{subject.name}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={12} />
                  {subject.timetableSlots.length} slot(s)
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Timetable Builder */}
      <div className="lg:col-span-2">
        {activeSubject ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-semibold font-outfit text-indigo-900 mb-4 flex items-center gap-2">
              <CalendarDays className="text-indigo-600" />
              Schedule for {subjects.find(s => s.id === activeSubject)?.name}
            </h2>

            <form onSubmit={(e) => handleAddSlot(e, activeSubject)} className="flex flex-wrap gap-4 items-end mb-8 bg-slate-50 p-4 rounded-xl">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Day</label>
                <select 
                  value={newSlotDay} 
                  onChange={(e) => setNewSlotDay(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white"
                >
                  {DAYS.map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start</label>
                <input 
                  type="time" 
                  required
                  value={newSlotStart}
                  onChange={(e) => setNewSlotStart(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">End</label>
                <input 
                  type="time" 
                  required
                  value={newSlotEnd}
                  onChange={(e) => setNewSlotEnd(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
                Add Slot
              </button>
            </form>

            <div className="space-y-3">
              {subjects.find(s => s.id === activeSubject)?.timetableSlots.length === 0 ? (
                <div className="text-center p-6 text-slate-500">
                  No classes scheduled yet.
                </div>
              ) : (
                subjects.find(s => s.id === activeSubject)?.timetableSlots
                  .sort((a, b) => a.dayOfWeek === b.dayOfWeek ? a.startTime.localeCompare(b.startTime) : a.dayOfWeek - b.dayOfWeek)
                  .map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                    <div className="flex gap-6 items-center">
                      <span className="font-medium text-slate-700 w-24">{DAYS[slot.dayOfWeek as number]}</span>
                      <span className="text-slate-600 bg-indigo-50 px-2 py-1 rounded text-sm">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteSlot(activeSubject, slot.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[300px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
            <p className="text-slate-500 flex flex-col items-center gap-2">
              <CalendarDays className="w-10 h-10 text-slate-300" />
              Select a subject to manage its schedule
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
