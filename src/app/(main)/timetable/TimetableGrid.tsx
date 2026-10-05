'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, ChevronRight, ChevronLeft, Save,
  CheckCircle2, Info, Settings2, Grid3x3,
  Upload, Loader2, Camera, X, Merge, SplitSquareHorizontal
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Break = { id: string; afterPeriod: number; duration: number; label: string };

type GridConfig = {
  activeDays: number[];      // 1 = Mon … 6 = Sat
  periodsPerDay: number;
  periodDuration: number;    // minutes
  startTime: string;         // "HH:mm"
  breaks: Break[];
};

type PeriodRow = { type: 'period'; period: number; start: string; end: string };
type BreakRow  = { type: 'break';  id: string; label: string; start: string; end: string };
type Row = PeriodRow | BreakRow;

type SlotEntry = {
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

// ─── Utilities ─────────────────────────────────────────────────────────────────

const DAY_ABBR = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minsToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
}

/** Build the ordered list of period/break rows with computed start/end times. */
function computeRows(cfg: GridConfig): Row[] {
  const rows: Row[] = [];
  let cur = timeToMins(cfg.startTime);

  for (let p = 1; p <= cfg.periodsPerDay; p++) {
    rows.push({ type: 'period', period: p, start: minsToTime(cur), end: minsToTime(cur + cfg.periodDuration) });
    cur += cfg.periodDuration;

    // breaks that fire after period p
    for (const br of cfg.breaks.filter(b => b.afterPeriod === p)) {
      rows.push({ type: 'break', id: br.id, label: br.label || 'Break', start: minsToTime(cur), end: minsToTime(cur + br.duration) });
      cur += br.duration;
    }
  }
  return rows;
}

/**
 * Apply the merge rule per day:
 * Consecutive cells in the same day with the same subject name → single TimetableSlot.
 * Breaks and blank cells break a run.
 */
function applyMerge(
  grid: Record<number, Record<number, string>>,
  rows: Row[],
  activeDays: number[],
): SlotEntry[] {
  const out: SlotEntry[] = [];

  for (const day of activeDays) {
    let runName: string | null = null;
    let runStart: string | null = null;
    let runEnd: string | null = null;

    const flush = () => {
      if (runName && runStart && runEnd) {
        out.push({ subjectName: runName, dayOfWeek: day, startTime: runStart, endTime: runEnd });
      }
      runName = null; runStart = null; runEnd = null;
    };

    for (const row of rows) {
      if (row.type === 'break') { flush(); continue; }

      const val = (grid[day]?.[row.period] ?? '').trim();

      if (!val) {
        flush();
      } else if (val === runName) {
        runEnd = row.end; // extend the current run
      } else {
        flush();
        runName = val; runStart = row.start; runEnd = row.end;
      }
    }
    flush();
  }

  return out;
}

/**
 * Compute merge info for visual rendering.
 * For each (day, period), returns: { merged: boolean, isFirst: boolean, spanSize: number, totalMins: number }
 * A cell is "merged" if it has the same subject as the next consecutive period (no break between).
 */
function computeMergeMap(
  grid: Record<number, Record<number, string>>,
  rows: Row[],
  activeDays: number[],
): Record<string, { merged: boolean; isFirst: boolean; spanSize: number; totalMins: number }> {
  const map: Record<string, { merged: boolean; isFirst: boolean; spanSize: number; totalMins: number }> = {};

  for (const day of activeDays) {
    // Get only period rows in order, tracking break boundaries
    const periodRows: PeriodRow[] = [];
    const breakAfter = new Set<number>(); // periods after which a break exists

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.type === 'period') {
        periodRows.push(row);
      } else if (row.type === 'break' && periodRows.length > 0) {
        breakAfter.add(periodRows[periodRows.length - 1].period);
      }
    }

    // Find runs of consecutive same-subject periods (not crossing breaks)
    let i = 0;
    while (i < periodRows.length) {
      const startRow = periodRows[i];
      const val = (grid[day]?.[startRow.period] ?? '').trim();

      if (!val) {
        map[`${day}-${startRow.period}`] = { merged: false, isFirst: false, spanSize: 1, totalMins: 0 };
        i++;
        continue;
      }

      // Find how far this run extends
      let j = i + 1;
      while (j < periodRows.length) {
        const prevPeriod = periodRows[j - 1].period;
        if (breakAfter.has(prevPeriod)) break; // break boundary
        const nextVal = (grid[day]?.[periodRows[j].period] ?? '').trim();
        if (nextVal !== val) break;
        j++;
      }

      const spanSize = j - i;
      const totalMins = timeToMins(periodRows[j - 1].end) - timeToMins(startRow.start);
      const isMerged = spanSize > 1;

      for (let k = i; k < j; k++) {
        map[`${day}-${periodRows[k].period}`] = {
          merged: isMerged,
          isFirst: k === i,
          spanSize,
          totalMins,
        };
      }

      i = j;
    }
  }

  return map;
}

// ─── TimetableUploader ────────────────────────────────────────────────────────

function TimetableUploader({
  onParseSuccess,
  onCancel,
}: {
  onParseSuccess: (data: any) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const form = new FormData();
    form.append('image', file);

    try {
      const res = await fetch('/api/timetable/parse', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to read timetable');
      onParseSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-outfit text-indigo-900">Upload Timetable Image</h3>
          <p className="text-sm text-slate-500">Let AI read your schedule automatically.</p>
        </div>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full border border-slate-200">
          <X size={16} />
        </button>
      </div>

      {!previewUrl ? (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-indigo-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-indigo-50/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Camera className="w-8 h-8 mb-3 text-indigo-400" />
            <p className="mb-2 text-sm text-slate-500"><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-slate-400">PNG, JPG up to 5MB</p>
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Timetable preview" className="w-full h-full object-contain" />
            <button
              onClick={() => { setFile(null); setPreviewUrl(null); }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 backdrop-blur-sm"
            >
              <X size={14} />
            </button>
          </div>
          
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {loading ? 'Reading Image...' : 'Create my timetable'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────

function ConfigPanel({
  cfg, setCfg, onGenerate,
}: {
  cfg: GridConfig;
  setCfg: React.Dispatch<React.SetStateAction<GridConfig>>;
  onGenerate: (parsedData?: any) => void;
}) {
  const toggleDay = (d: number) =>
    setCfg(c => ({
      ...c,
      activeDays: c.activeDays.includes(d)
        ? c.activeDays.filter(x => x !== d)
        : [...c.activeDays, d].sort(),
    }));

  const addBreak = () =>
    setCfg(c => ({
      ...c,
      breaks: [
        ...c.breaks,
        { id: Math.random().toString(36).slice(2), afterPeriod: Math.ceil(c.periodsPerDay / 2), duration: 30, label: 'Lunch' },
      ],
    }));

  const removeBreak = (id: string) =>
    setCfg(c => ({ ...c, breaks: c.breaks.filter(b => b.id !== id) }));

  const updateBreak = (id: string, field: keyof Break, value: string | number) =>
    setCfg(c => ({ ...c, breaks: c.breaks.map(b => b.id === id ? { ...b, [field]: value } : b) }));

  const canGenerate = cfg.activeDays.length > 0 && cfg.periodsPerDay >= 1 && cfg.periodDuration >= 5;

  const [showUploader, setShowUploader] = useState(false);

  return (
    <div className="space-y-7">
      
      {showUploader ? (
        <TimetableUploader 
          onCancel={() => setShowUploader(false)}
          onParseSuccess={(data) => {
            // Map AI output to state
            const activeDays = (data.days || []).map((d: string) => Math.max(1, DAY_ABBR.indexOf(d))).filter((d: number) => d > 0);
            
            const periodsPerDay = data.periods?.length || 6;
            const startTime = data.periods?.[0]?.start || '09:00';
            
            let duration = 50;
            if (data.periods?.[0]) {
              const p = data.periods[0];
              if (p.start && p.end) {
                duration = timeToMins(p.end) - timeToMins(p.start);
                if (duration <= 0) duration = 50;
              }
            }
            
            setCfg(c => ({
              ...c,
              activeDays: activeDays.length > 0 ? activeDays : c.activeDays,
              periodsPerDay,
              startTime,
              periodDuration: duration,
            }));
            
            // Just trigger the generate action and pass data back up
            onGenerate(data);
          }}
        />
      ) : (
        <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <div>
            <h4 className="font-semibold text-indigo-900">Have a picture of your schedule?</h4>
            <p className="text-xs text-indigo-700/70 mt-0.5">Upload it and let AI fill the grid for you.</p>
          </div>
          <button
            onClick={() => setShowUploader(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Camera size={16} /> Upload Image
          </button>
        </div>
      )}

      {/* Active days */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Active Days</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                cfg.activeDays.includes(d)
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {DAY_ABBR[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Period settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          ['Periods per Day', 'periodsPerDay', 1, 20, 1] as const,
          ['Period Duration (min)', 'periodDuration', 5, 300, 1] as const,
        ] as const).map(([label, key, min, max, step]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={cfg[key]}
              onChange={e =>
                setCfg(c => ({ ...c, [key]: Math.max(min, parseInt(e.target.value) || min) }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Day Starts At</label>
          <input
            type="time"
            value={cfg.startTime}
            onChange={e => setCfg(c => ({ ...c, startTime: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Breaks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Breaks</p>
          <button
            type="button"
            onClick={addBreak}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
          >
            <Plus size={13} /> Add Break
          </button>
        </div>

        {cfg.breaks.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-1">
            No breaks. Click &quot;Add Break&quot; to insert a recess or lunch.
          </p>
        ) : (
          <div className="space-y-2">
            {cfg.breaks.map(br => (
              <div key={br.id} className="flex flex-wrap gap-2 items-center p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <input
                  type="text"
                  placeholder="Label"
                  value={br.label}
                  onChange={e => updateBreak(br.id, 'label', e.target.value)}
                  className="flex-1 min-w-[100px] px-2 py-1 text-sm border border-amber-200 rounded-lg outline-none focus:border-amber-500 bg-white"
                />
                <span className="text-xs text-slate-500">after period</span>
                <select
                  value={br.afterPeriod}
                  onChange={e => updateBreak(br.id, 'afterPeriod', parseInt(e.target.value))}
                  className="px-2 py-1 text-xs border border-amber-200 rounded-lg bg-white outline-none"
                >
                  {Array.from({ length: cfg.periodsPerDay }, (_, i) => i + 1).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={br.duration}
                  onChange={e => updateBreak(br.id, 'duration', parseInt(e.target.value) || 30)}
                  className="w-16 px-2 py-1 text-xs border border-amber-200 rounded-lg bg-white outline-none"
                />
                <span className="text-xs text-slate-500">min</span>
                <button type="button" onClick={() => removeBreak(br.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onGenerate()}
        disabled={!canGenerate}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Grid3x3 size={18} /> Generate Grid
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type InitialSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { id: string; name: string; colorTag: string };
};

function deriveInitialGridAndConfig(initialSlots: InitialSlot[] = []) {
  if (!initialSlots || initialSlots.length === 0) {
    return {
      cfg: {
        activeDays: [1, 2, 3, 4, 5],
        periodsPerDay: 6,
        periodDuration: 50,
        startTime: '08:25',
        breaks: [],
      },
      grid: {},
      initialStep: 'config' as const,
    };
  }

  const activeDays = Array.from(new Set(initialSlots.map(s => s.dayOfWeek))).sort((a, b) => a - b);
  const earliestStart = initialSlots.reduce((min, s) => s.startTime < min ? s.startTime : min, initialSlots[0].startTime);
  const latestEnd = initialSlots.reduce((max, s) => s.endTime > max ? s.endTime : max, initialSlots[0].endTime);

  const durations = initialSlots.map(s => timeToMins(s.endTime) - timeToMins(s.startTime)).filter(d => d > 0);
  const minDuration = durations.length > 0 ? Math.min(...durations) : 50;
  const periodDuration = (minDuration >= 30 && minDuration <= 120) ? minDuration : 50;

  const totalSpanMins = timeToMins(latestEnd) - timeToMins(earliestStart);
  const periodsPerDay = Math.max(1, Math.min(12, Math.ceil(totalSpanMins / periodDuration)));

  const grid: Record<number, Record<number, string>> = {};
  for (const slot of initialSlots) {
    if (!grid[slot.dayOfWeek]) grid[slot.dayOfWeek] = {};
    const sStart = timeToMins(slot.startTime);
    const sEnd = timeToMins(slot.endTime);
    for (let p = 1; p <= periodsPerDay; p++) {
      const pStart = timeToMins(earliestStart) + (p - 1) * periodDuration;
      const pEnd = pStart + periodDuration;
      if (Math.max(sStart, pStart) < Math.min(sEnd, pEnd)) {
        grid[slot.dayOfWeek][p] = slot.subject.name;
      }
    }
  }

  return {
    cfg: {
      activeDays: activeDays.length > 0 ? activeDays : [1, 2, 3, 4, 5],
      periodsPerDay,
      periodDuration,
      startTime: earliestStart,
      breaks: [],
    },
    grid,
    initialStep: 'grid' as const,
  };
}

export default function TimetableGrid({
  existingSubjects,
  initialSlots = [],
  onBackToView,
}: {
  existingSubjects: { id: string; name: string; colorTag: string }[];
  initialSlots?: InitialSlot[];
  onBackToView?: () => void;
}) {
  const router = useRouter();
  const derived = useMemo(() => deriveInitialGridAndConfig(initialSlots), [initialSlots]);
  const [step, setStep] = useState<'config' | 'grid'>(derived.initialStep);
  const [cfg, setCfg] = useState<GridConfig>(derived.cfg);
  const [grid, setGrid] = useState<Record<number, Record<number, string>>>(derived.grid);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const rows    = useMemo(() => computeRows(cfg), [cfg]);
  const preview = useMemo(() => applyMerge(grid, rows, cfg.activeDays), [grid, rows, cfg.activeDays]);

  const setCell = (day: number, period: number, value: string) =>
    setGrid(g => ({ ...g, [day]: { ...(g[day] ?? {}), [period]: value } }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: preview, replaceAll: true }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Save failed');
      }
      setSaved(true);
      const urlParams = new URLSearchParams(window.location.search);
      const isOnboarding = urlParams.get('onboarding') === 'true';
      setTimeout(() => { 
        if (isOnboarding) {
          router.push('/onboarding/backfill'); 
        } else if (onBackToView) {
          onBackToView();
          router.refresh();
        } else {
          router.push('/'); 
        }
        router.refresh(); 
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <CheckCircle2 className="text-emerald-500 w-14 h-14" />
        <p className="text-xl font-bold font-outfit text-slate-800">Timetable saved!</p>
        <p className="text-sm text-slate-500">
          {onBackToView ? 'Returning to timetable view…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  const DATALIST_ID = 'subject-autocomplete-list';

  return (
    <div>
      {/* Step indicator and View Back button */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-2 text-sm select-none">
          <span
            onClick={() => step === 'grid' && setStep('config')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
              step === 'config' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Settings2 size={13} /> 1. Configure
          </span>
          <ChevronRight size={14} className="text-slate-300" />
          <span
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors ${
              step === 'grid' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Grid3x3 size={13} /> 2. Fill Grid
          </span>
        </div>

        {onBackToView && (
          <button
            type="button"
            onClick={onBackToView}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <ChevronLeft size={14} /> Back to View Schedule
          </button>
        )}
      </div>

      {step === 'config' ? (
        <ConfigPanel 
          cfg={cfg} 
          setCfg={setCfg} 
          onGenerate={(parsedData?: any) => {
            if (parsedData?.slots) {
              const newGrid: Record<number, Record<number, string>> = {};
              for (const slot of parsedData.slots) {
                const dayIdx = DAY_ABBR.indexOf(slot.day);
                if (dayIdx > 0 && slot.period && slot.subject) {
                  if (!newGrid[dayIdx]) newGrid[dayIdx] = {};
                  newGrid[dayIdx][slot.period] = slot.subject;
                }
              }
              setGrid(newGrid);
            }
            setStep('grid');
          }} 
        />
      ) : (
        <div className="space-y-5">
          {/* Back */}
          <button
            onClick={() => setStep('config')}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ChevronLeft size={15} /> Back to Configure
          </button>

          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Type a subject name per cell. <strong>Same name in consecutive periods</strong> auto-merges into one class slot (shown with a purple bar). Use <strong>Merge</strong> to fill down, or <strong>Unmerge</strong> to split apart.
            </span>
          </div>

          {/* Autocomplete datalist */}
          <datalist id={DATALIST_ID}>
            {existingSubjects.map(s => <option key={s.id} value={s.name} />)}
          </datalist>

          {/* Scrollable grid */}
          {(() => {
            const mergeMap = computeMergeMap(grid, rows, cfg.activeDays);
            
            // Helper: merge consecutive periods for a day by filling same subject
            const handleMergeDown = (day: number, period: number) => {
              const val = (grid[day]?.[period] ?? '').trim();
              if (!val) return;
              // Find the next period row
              const periodRows = rows.filter((r): r is PeriodRow => r.type === 'period');
              const idx = periodRows.findIndex(r => r.period === period);
              if (idx < 0 || idx >= periodRows.length - 1) return;
              // Check no break between
              const curRowIdx = rows.findIndex(r => r.type === 'period' && r.period === period);
              const nextPeriodRow = periodRows[idx + 1];
              let hasBreakBetween = false;
              for (let ri = curRowIdx + 1; ri < rows.length; ri++) {
                if (rows[ri].type === 'break') { hasBreakBetween = true; break; }
                if (rows[ri].type === 'period') break;
              }
              if (hasBreakBetween) return;
              setCell(day, nextPeriodRow.period, val);
            };

            // Helper: unmerge — clear all but the first period in a run
            const handleUnmerge = (day: number, period: number) => {
              const val = (grid[day]?.[period] ?? '').trim();
              if (!val) return;
              const periodRows = rows.filter((r): r is PeriodRow => r.type === 'period');
              const idx = periodRows.findIndex(r => r.period === period);
              if (idx < 0) return;
              // Clear forward
              for (let k = idx + 1; k < periodRows.length; k++) {
                const nextVal = (grid[day]?.[periodRows[k].period] ?? '').trim();
                if (nextVal !== val) break;
                // Check no break between k-1 and k
                const prevRowIdx = rows.findIndex(r => r.type === 'period' && r.period === periodRows[k - 1].period);
                let hasBreak = false;
                for (let ri = prevRowIdx + 1; ri < rows.length; ri++) {
                  if (rows[ri].type === 'break') { hasBreak = true; break; }
                  if (rows[ri].type === 'period') break;
                }
                if (hasBreak) break;
                setCell(day, periodRows[k].period, '');
              }
            };

            return (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 px-4 py-2.5 text-left text-xs font-semibold text-slate-500 w-28">
                      Period
                    </th>
                    {cfg.activeDays.map(d => (
                      <th key={d} className="px-3 py-2.5 text-center text-xs font-bold text-indigo-700 min-w-[130px]">
                        {DAY_ABBR[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    if (row.type === 'break') {
                      return (
                        <tr key={`b-${row.id}`} className="border-b border-amber-100 bg-amber-50">
                          <td className="sticky left-0 z-10 bg-amber-50 border-r border-amber-100 px-4 py-2">
                            <div className="text-xs font-semibold text-amber-700">{row.label}</div>
                            <div className="text-xs text-amber-500">{row.start}–{row.end}</div>
                          </td>
                          <td
                            colSpan={cfg.activeDays.length}
                            className="text-center text-xs text-amber-400 italic py-2"
                          >
                            — break —
                          </td>
                        </tr>
                      );
                    }

                    const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';
                    const stickyBg = i % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                    return (
                      <tr key={`p-${row.period}`} className={`border-b border-slate-100 ${rowBg}`}>
                        <td className={`sticky left-0 z-10 ${stickyBg} border-r border-slate-200 px-4 py-2`}>
                          <div className="text-xs font-bold text-slate-700">P{row.period}</div>
                          <div className="text-xs text-slate-400 font-mono">{row.start}–{row.end}</div>
                        </td>
                        {cfg.activeDays.map(day => {
                          const val = grid[day]?.[row.period] ?? '';
                          const isKnown = existingSubjects.some(s => s.name === val.trim());
                          const colorTag = isKnown
                            ? existingSubjects.find(s => s.name === val.trim())?.colorTag
                            : undefined;
                          const mInfo = mergeMap[`${day}-${row.period}`];
                          const isMerged = mInfo?.merged;
                          const isFirst = mInfo?.isFirst;
                          const totalMins = mInfo?.totalMins ?? 0;
                          const spanSize = mInfo?.spanSize ?? 1;
                          
                          // Check if we can merge down (next period exists, same subject or empty, no break)
                          const periodRows = rows.filter((r): r is PeriodRow => r.type === 'period');
                          const pIdx = periodRows.findIndex(r => r.period === row.period);
                          const nextPeriod = pIdx >= 0 && pIdx < periodRows.length - 1 ? periodRows[pIdx + 1] : null;
                          let canMergeDown = false;
                          if (val.trim() && nextPeriod) {
                            const nextVal = (grid[day]?.[nextPeriod.period] ?? '').trim();
                            if (nextVal === '' || nextVal !== val.trim()) {
                              // Check no break between
                              const curRowIdx = rows.findIndex(r => r.type === 'period' && r.period === row.period);
                              let hasBreak = false;
                              for (let ri = curRowIdx + 1; ri < rows.length; ri++) {
                                if (rows[ri].type === 'break') { hasBreak = true; break; }
                                if (rows[ri].type === 'period') break;
                              }
                              if (!hasBreak && nextVal === '') canMergeDown = true;
                            }
                          }

                          // Determine if this cell is the last period in a merged group
                          const isLast = isMerged && (() => {
                            const nextP = pIdx < periodRows.length - 1 ? periodRows[pIdx + 1] : null;
                            if (!nextP) return true;
                            const nextInfo = mergeMap[`${day}-${nextP.period}`];
                            return !nextInfo?.merged || nextInfo.isFirst;
                          })();

                          let mergeClass = '';
                          if (isMerged) {
                            if (isFirst && isLast) {
                              mergeClass = 'border-[3px] border-violet-400 rounded-lg bg-violet-50/40 p-1';
                            } else if (isFirst) {
                              mergeClass = 'border-l-[3px] border-t-[3px] border-r-[3px] border-violet-400 rounded-t-lg bg-violet-50/40 -mb-[1px] pb-1';
                            } else if (isLast) {
                              mergeClass = 'border-l-[3px] border-b-[3px] border-r-[3px] border-violet-400 rounded-b-lg bg-violet-50/40 -mt-[1px] pt-1';
                            } else {
                              mergeClass = 'border-l-[3px] border-r-[3px] border-violet-400 bg-violet-50/40 -mt-[1px] -mb-[1px] py-1';
                            }
                          }

                          return (
                            <td key={day} className="px-2 py-1.5">
                              <div className={`relative ${mergeClass}`}>
                                {/* Merged badge on first cell */}
                                {isMerged && isFirst && (
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded">
                                      {spanSize} periods · {totalMins >= 60 ? `${Math.floor(totalMins / 60)}h${totalMins % 60 > 0 ? ` ${totalMins % 60}m` : ''}` : `${totalMins}m`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUnmerge(day, row.period)}
                                      className="text-[10px] text-violet-500 hover:text-violet-700 flex items-center gap-0.5 font-medium"
                                      title="Unmerge these periods"
                                    >
                                      <SplitSquareHorizontal size={10} /> Split
                                    </button>
                                  </div>
                                )}
                                {colorTag && (
                                  <span
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                                    style={{ backgroundColor: colorTag }}
                                  />
                                )}
                                <input
                                  type="text"
                                  list={DATALIST_ID}
                                  value={val}
                                  onChange={e => setCell(day, row.period, e.target.value)}
                                  placeholder="—"
                                  className={`w-full ${colorTag ? 'pl-5' : 'pl-2'} pr-2 py-1.5 text-xs border rounded-lg outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 text-center placeholder:text-slate-300 transition-colors ${
                                    isMerged ? 'border-violet-200 bg-violet-50/50' : val ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                />
                                {/* Merge down button */}
                                {canMergeDown && !isMerged && (
                                  <button
                                    type="button"
                                    onClick={() => handleMergeDown(day, row.period)}
                                    className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] font-medium text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded py-0.5 transition-colors"
                                    title="Merge with next period"
                                  >
                                    <Merge size={10} /> Merge ↓
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            );
          })()}

          {/* Slot preview count */}
          <p className="text-xs text-slate-500">
            {preview.length > 0
              ? `${preview.length} slot${preview.length !== 1 ? 's' : ''} will be created after merging consecutive same-subject cells.`
              : 'Fill in subject names above to generate slots.'}
          </p>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Saving will <strong>replace all existing timetable slots</strong> for your semester. Subjects not in the grid keep their records but lose their schedule.
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || preview.length === 0}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Saving…' : `Save Timetable (${preview.length} slot${preview.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </div>
  );
}
