'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar, Info, AlertCircle, RefreshCw } from 'lucide-react';

type HolidayInfo = {
  id: string;
  date: string;
  name: string;
  source: 'auto' | 'manual';
};

type CalendarClientProps = {
  initialHolidays: HolidayInfo[];
  semesterDates: { startDate: string; endDate: string } | null;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarClient({ initialHolidays, semesterDates }: CalendarClientProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => {
    // Default to current date, or semester start date if present
    if (semesterDates) {
      const semStart = new Date(semesterDates.startDate);
      const now = new Date();
      if (now >= semStart && now <= new Date(semesterDates.endDate)) {
        return now;
      }
      return semStart;
    }
    return new Date();
  });
  
  const [holidays, setHolidays] = useState<HolidayInfo[]>(initialHolidays);
  const [togglingDate, setTogglingDate] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'error'>('info');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/holidays/import', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import failed');
      
      showToast(`Imported ${data.importedCount} public holidays`);
      
      // Fetch updated list to sync local client state
      const listRes = await fetch('/api/holidays');
      if (listRes.ok) {
        const listData = await listRes.json();
        setHolidays(listData.holidays.map((h: any) => ({
          id: h.id,
          date: h.date,
          name: h.name,
          source: h.source,
        })));
      }
      
      router.refresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const showToast = (message: string, type: 'info' | 'error' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create an array of days to display in the grid
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Derived counts — semester-wide vs visible month only
  // Both use UTC getUTC* to match the date storage format
  const isInCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getUTCFullYear() === year && d.getUTCMonth() === month;
  };
  const semesterAutoCount  = holidays.filter(h => h.source === 'auto').length;
  const semesterManualCount = holidays.filter(h => h.source === 'manual').length;
  const monthAutoCount  = holidays.filter(h => h.source === 'auto'   && isInCurrentMonth(h.date)).length;
  const monthManualCount = holidays.filter(h => h.source === 'manual' && isInCurrentMonth(h.date)).length;

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to format date as YYYY-MM-DD
  const formatDateString = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleDayClick = async (day: number) => {
    const dateStr = formatDateString(day);
    
    // Check if within semester range
    if (semesterDates) {
      const dateVal = new Date(Date.UTC(year, month, day));
      const startVal = new Date(semesterDates.startDate);
      const endVal = new Date(semesterDates.endDate);
      
      // Normalize to UTC midnight for correct range checks
      const startUTC = new Date(Date.UTC(startVal.getUTCFullYear(), startVal.getUTCMonth(), startVal.getUTCDate()));
      const endUTC = new Date(Date.UTC(endVal.getUTCFullYear(), endVal.getUTCMonth(), endVal.getUTCDate()));

      if (dateVal < startUTC || dateVal > endUTC) {
        showToast('Date is outside your semester range.', 'error');
        return;
      }
    }

    const existing = holidays.find(h => {
      const hDate = new Date(h.date);
      const hStr = `${hDate.getUTCFullYear()}-${String(hDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hDate.getUTCDate()).padStart(2, '0')}`;
      return hStr === dateStr;
    });

    if (existing && existing.source === 'auto') {
      showToast("Auto-imported holidays cannot be deleted.", 'error');
      return;
    }

    setTogglingDate(dateStr);
    
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, name: 'Manual Holiday' }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Error updating holiday');
      }

      if (data.toggled) {
        setHolidays([...holidays, data.holiday]);
        showToast('Marked as holiday');
      } else {
        setHolidays(holidays.filter(h => h.id !== existing?.id));
        showToast('Removed holiday');
      }
      
      router.refresh(); // Refresh dashboard counts
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setTogglingDate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 text-sm z-50 animate-bounce ${
          toastType === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toastType === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Month Picker & Import Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-xl font-bold font-outfit text-indigo-900 flex items-center gap-2">
            <Calendar className="text-indigo-600" size={20} />
            {MONTHS[month]} {year}
          </h2>
          {/* Month-scoped counts — unambiguously labelled */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-24">This month</span>
              <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-xs font-bold">
                {monthAutoCount} public
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-xs font-bold">
                {monthManualCount} manual
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-24">This semester</span>
              <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-xs font-bold">
                {semesterAutoCount} public
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-xs font-bold">
                {semesterManualCount} manual
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={importing ? 'animate-spin' : ''} />
            {importing ? 'Importing...' : 'Import Public Holidays'}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Days of week */}
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-bold text-slate-400 py-1 uppercase tracking-wider">
            {day}
          </div>
        ))}

        {/* Blank cells for start offset */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`blank-${idx}`} className="aspect-square bg-slate-50/50 rounded-xl border border-dashed border-slate-100" />
        ))}

        {/* Day cells */}
        {days.map(day => {
          const dateStr = formatDateString(day);
          
          // Find if holiday exists
          const holiday = holidays.find(h => {
            const hDate = new Date(h.date);
            const hStr = `${hDate.getUTCFullYear()}-${String(hDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hDate.getUTCDate()).padStart(2, '0')}`;
            return hStr === dateStr;
          });

          const isHoliday = !!holiday;
          const isAuto = holiday?.source === 'auto';
          const isSaving = togglingDate === dateStr;

          // Sunday detection — display-only shading; no data writes, no planner impact
          // getRemainingClasses already excludes dayOfWeek===0 via the isWorkingDay check
          const isSunday = new Date(year, month, day).getDay() === 0;

          // Check if outside semester range
          let isOutsideSemester = false;
          if (semesterDates) {
            const dateVal = new Date(Date.UTC(year, month, day));
            const startVal = new Date(semesterDates.startDate);
            const endVal = new Date(semesterDates.endDate);
            const startUTC = new Date(Date.UTC(startVal.getUTCFullYear(), startVal.getUTCMonth(), startVal.getUTCDate()));
            const endUTC = new Date(Date.UTC(endVal.getUTCFullYear(), endVal.getUTCMonth(), endVal.getUTCDate()));
            isOutsideSemester = dateVal < startUTC || dateVal > endUTC;
          }

          // Priority: outside-semester > holiday > sunday > normal
          let cellClass = "relative aspect-square flex flex-col justify-between p-2 rounded-xl border transition-all text-left group ";
          if (isOutsideSemester) {
            cellClass += "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed select-none";
          } else if (isHoliday) {
            cellClass += isAuto
              ? "bg-red-50 border-red-200 hover:border-red-300 text-red-700 cursor-pointer"
              : "bg-indigo-50 border-indigo-200 hover:border-indigo-300 text-indigo-700 cursor-pointer";
          } else if (isSunday) {
            // Visual-only — Sundays are already excluded from planner math (dayOfWeek !== 0 check)
            cellClass += "bg-slate-100/70 border-slate-200 text-slate-400 cursor-pointer hover:border-slate-300";
          } else {
            cellClass += "bg-white border-slate-100 hover:border-indigo-300 text-slate-700 cursor-pointer hover:shadow-sm";
          }

          return (
            <button
              key={day}
              type="button"
              disabled={isOutsideSemester || isSaving}
              onClick={() => handleDayClick(day)}
              className={cellClass}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-bold font-outfit">
                  {day}
                </span>
                {isHoliday && (
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    isAuto ? 'bg-red-200 text-red-800' : 'bg-indigo-200 text-indigo-800'
                  }`}>
                    {isAuto ? 'Public' : 'Manual'}
                  </span>
                )}
              </div>
              
              {holiday && (
                <div className="text-[10px] leading-tight truncate font-medium max-w-full opacity-90">
                  {holiday.name}
                </div>
              )}

              {isSaving && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend & Instructions */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <h4 className="text-sm font-semibold text-slate-700">Calendar Legend</h4>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-indigo-50 border border-indigo-200" />
            <span>Manual Holiday (Togglable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-red-50 border border-red-200" />
            <span>Official Holiday (Non-deletable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-slate-50 border border-slate-100" />
            <span>Outside Semester Range</span>
          </div>
        </div>
      </div>
    </div>
  );
}
