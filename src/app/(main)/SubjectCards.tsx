'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import type { PlannerMetrics } from '@/lib/attendance';

type SubjectMetric = {
  id: string;
  name: string;
  colorTag: string;
  baselineAttended: number;
  baselineHeld: number;
  metrics: PlannerMetrics;
};

function PercentRing({ percent, target, size = 56 }: { percent: number; target: number; size?: number }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(percent, 0), 100);
  const offset = circ - (pct / 100) * circ;
  const color = percent >= target ? '#10b981' : percent >= target * 0.9 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {percent}%
      </span>
    </div>
  );
}

function WhatIfSimulator({ metrics }: { metrics: PlannerMetrics }) {
  const [absences, setAbsences] = useState(0);
  const max = metrics.remaining;

  // Simulate: if user takes `absences` more absences and attends the rest
  const futureAttended = metrics.attended + (metrics.remaining - absences);
  const futureTotal = metrics.totalHeld + metrics.remaining;
  const projectedPercent = futureTotal === 0 ? 100 : Math.round((futureAttended / futureTotal) * 100);
  const meetsTarget = projectedPercent >= metrics.targetPercent;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">What-If Simulator</p>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-slate-600 shrink-0">If I skip</span>
        <input
          type="range"
          min={0}
          max={max}
          value={absences}
          onChange={e => setAbsences(Number(e.target.value))}
          className="flex-1 h-1.5 appearance-none bg-slate-200 rounded-full accent-indigo-600"
        />
        <span className="text-sm font-bold text-slate-800 w-16 text-right">
          {absences} more {absences === 1 ? 'class' : 'classes'}
        </span>
      </div>
      <div className={`flex items-center justify-between p-3 rounded-xl ${meetsTarget ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
        <div>
          <p className="text-xs text-slate-500">Projected attendance</p>
          <p className={`text-lg font-bold font-outfit ${meetsTarget ? 'text-emerald-700' : 'text-red-600'}`}>
            {projectedPercent}%
          </p>
        </div>
        <div className="text-right">
          {meetsTarget ? (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><TrendingUp size={14}/> Still on track</span>
          ) : (
            <span className="text-xs font-medium text-red-500 flex items-center gap-1"><TrendingDown size={14}/> Below target</span>
          )}
          <p className="text-xs text-slate-400 mt-1">Target: {metrics.targetPercent}%</p>
        </div>
      </div>
    </div>
  );
}

function SubjectCard({ sm }: { sm: SubjectMetric }) {
  const [expanded, setExpanded] = useState(false);
  const m = sm.metrics;
  const statusColor = m.unreachable ? 'text-red-600' : m.currentPercent >= m.targetPercent ? 'text-emerald-600' : 'text-amber-600';
  // Below target (but not yet unreachable) — show red left accent for quick visual scan
  const isBelowTarget = !m.unreachable && m.currentPercent < m.targetPercent && m.totalHeld > 0;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      style={isBelowTarget ? { borderLeft: '4px solid #ef4444' } : undefined}
    >
      {/* Header with color strip */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: sm.colorTag }} />
        <div className="pt-5 px-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sm.colorTag }} />
              <h3 className="font-semibold font-outfit text-slate-800">{sm.name}</h3>
            </div>
            <PercentRing percent={m.currentPercent} target={m.targetPercent} />
          </div>

          {/* Stats row */}
          {m.unreachable ? (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mb-3">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-600">Target unreachable this semester</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Best possible: <strong>{m.bestPossiblePercent}%</strong> (if you attend all {m.remaining} remaining classes)
                </p>
              </div>
            </div>
          ) : null}

          {sm.baselineHeld > 0 && (
            <div className="flex items-start gap-2 p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl mb-3 text-xs text-indigo-700">
              <Info size={14} className="mt-0.5 shrink-0 opacity-70" />
              <p>Includes {sm.baselineAttended}/{sm.baselineHeld} from before you started tracking</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-50 rounded-xl p-2">
              <p className="text-lg font-bold font-outfit text-slate-800">{m.attended}</p>
              <p className="text-xs text-slate-500">Attended</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2">
              <p className="text-lg font-bold font-outfit text-slate-800">{m.totalHeld}</p>
              <p className="text-xs text-slate-500">Held</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2">
              <p className="text-lg font-bold font-outfit text-emerald-700">{m.mustAttend}</p>
              <p className="text-xs text-emerald-600">Must Go</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-2">
              <p className="text-lg font-bold font-outfit text-amber-700">{m.canSkip}</p>
              <p className="text-xs text-amber-600">Can Skip</p>
            </div>
          </div>

          {/* Target vs Current */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className={`font-semibold ${statusColor}`}>{m.currentPercent}% current</span>
            <span>·</span>
            <span>{m.targetPercent}% target</span>
            <span>·</span>
            <span>{m.remaining} remaining</span>
          </div>
        </div>
      </div>

      {/* Expandable What-If */}
      {m.remaining > 0 && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-indigo-600 font-medium hover:bg-indigo-50 transition-colors"
          >
            <span>What-If Simulator</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div className="px-5 pb-5">
              <WhatIfSimulator metrics={m} />
            </div>
          )}
        </div>
      )}

      {/* Log Management Footer */}
      <div className="border-t border-slate-100 bg-slate-50/50">
        <Link
          href={`/subjects/${sm.id}/logs`}
          className="w-full flex items-center justify-center px-5 py-3 text-xs text-slate-500 font-medium hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
        >
          Manage Logged Days
        </Link>
      </div>
    </div>
  );
}

export default function SubjectCards({ subjectMetrics }: { subjectMetrics: SubjectMetric[] }) {
  if (subjectMetrics.length === 0) {
    return (
      <div className="text-center p-10 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
        <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 mb-4">You haven&apos;t added any subjects yet.</p>
        <Link href="/subjects" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 font-medium">
          Add Subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {subjectMetrics.map(sm => (
        <SubjectCard key={sm.id} sm={sm} />
      ))}
    </div>
  );
}
