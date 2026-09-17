// ============================================================================
// KetakKetik — Session History Dashboard
// ============================================================================

import React, { useState, useMemo } from 'react';
import { WpmEntry, ProfileStats } from '@app/persistence/types';
import type { EffectiveTheme } from '@app/types/ui';

interface SessionHistoryDashboardProps {
  sessions: WpmEntry[];
  stats: ProfileStats | null;
  loading: { sessions: boolean; stats: boolean };
  errors: Record<string, Error | null>;
  effectiveTheme: EffectiveTheme;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function filterByDateRange(sessions: WpmEntry[], days: number): WpmEntry[] {
  if (days <= 0) return sessions;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => s.timestamp >= cutoff);
}

function getDayGroup(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(ts);
}

/* ── Stat Card ───────────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  effectiveTheme: EffectiveTheme;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, sublabel, effectiveTheme, icon,
}) => {
  const bg = effectiveTheme === 'dark' ? 'bg-gray-800/60 border-gray-700/40' : 'bg-white/80 border-gray-200/60';
  const labelColor = effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const valueColor = effectiveTheme === 'dark' ? 'text-gray-100' : 'text-gray-900';

  return (
    <div className={`rounded-xl p-4 border ${bg} flex items-start gap-3`}>
      {icon && <div className="mt-0.5 shrink-0 text-blue-400">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className={`text-xs uppercase tracking-wider font-medium ${labelColor}`}>{label}</div>
        <div className={`text-2xl font-bold mt-0.5 truncate ${valueColor}`}>{value}</div>
        {sublabel && (
          <div className={`text-xs mt-0.5 ${labelColor}`}>{sublabel}</div>
        )}
      </div>
    </div>
  );
};

/* ── Trend Mini-Sparks ───────────────────────────────────────────────────── */

function TrendSparkline({
  data, effectiveTheme, height = 32,
}: {
  data: number[];
  effectiveTheme: EffectiveTheme;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div className={`text-xs italic ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        Not enough data
      </div>
    );
  }

  const width = 120;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const isUp = data[data.length - 1] >= data[0];
  const strokeColor = isUp ? '#22c55e' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ maxHeight: height }}>
      <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── WPM Trend Chart ─────────────────────────────────────────────────────── */

function WpmTrendChart({
  trend, effectiveTheme,
}: {
  trend: number[];
  effectiveTheme: EffectiveTheme;
}) {
  const width = 600;
  const height = 140;
  const pad = { top: 10, right: 10, bottom: 24, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  if (trend.length < 2) {
    return (
      <div className={`rounded-xl border p-8 text-center ${
        effectiveTheme === 'dark' ? 'bg-gray-800/40 border-gray-700/30 text-gray-400' : 'bg-white/60 border-gray-200/40 text-gray-500'
      }`}>
        <p className="text-sm">Complete more sessions to see your WPM trend.</p>
      </div>
    );
  }

  const min = Math.max(0, Math.min(...trend) - 5);
  const max = Math.ceil(Math.max(...trend) / 10) * 10 + 10;
  const range = max - min || 1;

  const x = (i: number) => pad.left + (i / (trend.length - 1)) * chartW;
  const y = (v: number) => pad.top + chartH - ((v - min) / range) * chartH;

  const points = trend.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPoints = `${x(0)},${pad.top + chartH} ${points} ${x(trend.length - 1)},${pad.top + chartH}`;

  const isUp = trend[trend.length - 1] >= trend[0];
  const lineColor = isUp ? '#3b82f6' : '#ef4444';
  const fillGrad = isUp ? 'url(#trendUp)' : 'url(#trendDown)';

  return (
    <div className={`rounded-xl border p-4 ${
      effectiveTheme === 'dark' ? 'bg-gray-800/40 border-gray-700/30' : 'bg-white/60 border-gray-200/40'
    }`}>
      <div className={`text-sm font-semibold uppercase tracking-wider mb-2 ${
        effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>WPM Trend (Last {trend.length} Sessions)</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="trendUp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="trendDown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const val = Math.round(min + range * frac);
          const yPos = y(val);
          return (
            <g key={frac}>
              <line x1={pad.left} x2={width - pad.right} y1={yPos} y2={yPos}
                stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
              <text x={pad.left - 6} y={yPos + 4} textAnchor="end"
                fill="currentColor" fontSize="9" stroke="none">
                {val}
              </text>
            </g>
          );
        })}
        {/* Area + line */}
        <polygon points={areaPoints} fill={fillGrad} />
        <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {trend.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={lineColor} />
        ))}
      </svg>
    </div>
  );
}

/* ── Weak/Strong Keys ────────────────────────────────────────────────────── */

function KeyBar({
  label, value, maxVal, effectiveTheme,
}: {
  label: string;
  value: number;
  maxVal: number;
  effectiveTheme: EffectiveTheme;
}) {
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
  const barBg = effectiveTheme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200/60';
  const barFill = effectiveTheme === 'dark' ? 'bg-red-400/70' : 'bg-red-400/60';
  const textColor = effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700';

  return (
    <div className="flex items-center gap-2">
      <span className={`w-6 text-center font-mono text-sm font-bold ${textColor}`}>{label}</span>
      <div className={`flex-1 h-5 rounded-full ${barBg} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${barFill} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-14 text-right text-xs font-mono ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function KeyInsights({
  stats, effectiveTheme,
}: {
  stats: ProfileStats;
  effectiveTheme: EffectiveTheme;
}) {
  const sectionBg = effectiveTheme === 'dark' ? 'bg-gray-800/40 border-gray-700/30' : 'bg-white/60 border-gray-200/40';
  const headingColor = effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const headerBg = effectiveTheme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80';

  if (!stats) return null;

  const renderKeys = (keys: typeof stats.weakestKeys, title: string) => {
    if (keys.length === 0) return null;
    const maxScore = keys[0].weaknessScore;
    return (
      <div className={`rounded-xl border overflow-hidden ${sectionBg}`}>
        <div className={`px-4 py-2 font-semibold text-sm ${headerBg} ${headingColor}`}>{title}</div>
        <div className="p-4 space-y-2">
          {keys.slice(0, 8).map((wk) => (
            <KeyBar
              key={wk.key}
              label={wk.key === ';' ? ';' : wk.key.toUpperCase()}
              value={wk.weaknessScore}
              maxVal={maxScore}
              effectiveTheme={effectiveTheme}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
        Key Insights
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderKeys(stats.weakestKeys, 'Keys to Practice')}
        {renderKeys(stats.strongestKeys, 'Strongest Keys')}
      </div>
      <div className={`rounded-xl border p-4 ${sectionBg}`}>
        <div className={`text-sm font-semibold uppercase tracking-wider mb-3 ${headingColor}`}>Accuracy Trend</div>
        <TrendSparkline data={stats.accuracyTrend} effectiveTheme={effectiveTheme} />
      </div>
    </div>
  );
}

/* ── Session Item ────────────────────────────────────────────────────────── */

interface SessionItemProps {
  session: WpmEntry;
  effectiveTheme: EffectiveTheme;
  expanded: boolean;
  onToggle: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session, effectiveTheme, expanded, onToggle,
}) => {
  const bg = effectiveTheme === 'dark' ? 'bg-gray-800/40 hover:bg-gray-800/60 border-gray-700/30' : 'bg-white/70 hover:bg-white/90 border-gray-200/50';
  const textColor = effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const mutedColor = effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const accentColor = effectiveTheme === 'dark' ? 'text-blue-300' : 'text-blue-600';

  const accuracyColor = session.accuracy >= 95
    ? 'text-green-400'
    : session.accuracy >= 90
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <div
      className={`rounded-xl border transition-all duration-200 cursor-pointer ${bg}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`Session on ${formatDate(session.timestamp)}, ${session.avgWpm} WPM, ${session.accuracy}% accuracy`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Date */}
          <div className={`shrink-0 text-xs font-medium ${mutedColor}`}>
            {formatDate(session.timestamp)}
            <div className={accentColor}>{formatTime(session.timestamp)}</div>
          </div>

          {/* Separator */}
          <div className={`w-px h-8 ${effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* WPM */}
          <div>
            <div className={`text-xs ${mutedColor}`}>WPM</div>
            <div className={`text-lg font-bold ${accentColor}`}>{session.avgWpm}</div>
          </div>

          {/* Accuracy */}
          <div>
            <div className={`text-xs ${mutedColor}`}>Acc</div>
            <div className={`text-lg font-bold ${accuracyColor}`}>{session.accuracy}%</div>
          </div>

          {/* Duration */}
          <div>
            <div className={`text-xs ${mutedColor}`}>Duration</div>
            <div className={`text-sm font-medium ${textColor}`}>{formatDuration(session.durationMs)}</div>
          </div>

          {/* Errors */}
          <div>
            <div className={`text-xs ${mutedColor}`}>Errors</div>
            <div className={`text-sm font-medium ${textColor}`}>
              {Math.round(session.durationMs / 60000 * session.avgWpm * 5 * (1 - session.accuracy / 100))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Arrow */}
          <svg
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''} ${mutedColor}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7l7-7" />
          </svg>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className={`mt-4 pt-3 border-t ${effectiveTheme === 'dark' ? 'border-gray-700/40' : 'border-gray-200/60'} space-y-3`}>
            {session.textSample && (
              <div>
                <div className={`text-xs font-medium mb-1 ${mutedColor}`}>Text Sample</div>
                <div className={`text-sm leading-relaxed p-2 rounded-lg ${
                  effectiveTheme === 'dark' ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-50 text-gray-700'
                }`}>
                  {session.textSample.length > 200
                    ? session.textSample.slice(0, 200) + '…'
                    : session.textSample}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className={mutedColor}>Peak WPM: </span>
                <span className={`font-semibold ${accentColor}`}>{session.peakWpm}</span>
              </div>
              <div>
                <span className={mutedColor}>Accuracy: </span>
                <span className={`font-semibold ${accuracyColor}`}>{session.accuracy}%</span>
              </div>
              <div>
                <span className={mutedColor}>Duration: </span>
                <span className={`font-semibold ${textColor}`}>{formatDuration(session.durationMs)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Empty State ─────────────────────────────────────────────────────────── */

function EmptyState({ effectiveTheme }: { effectiveTheme: EffectiveTheme }) {
  return (
    <div className={`rounded-xl border p-12 text-center ${
      effectiveTheme === 'dark' ? 'bg-gray-800/40 border-gray-700/30 text-gray-400' : 'bg-white/60 border-gray-200/40 text-gray-500'
    }`}>
      <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="font-medium">No sessions yet</p>
      <p className="text-sm mt-1">Complete a typing session to see your history here.</p>
    </div>
  );
}

/* ── Loading State ───────────────────────────────────────────────────────── */

function LoadingState({ effectiveTheme, label }: { effectiveTheme: EffectiveTheme; label: string }) {
  return (
    <div className={`rounded-xl border p-8 text-center ${
      effectiveTheme === 'dark' ? 'bg-gray-800/40 border-gray-700/30' : 'bg-white/60 border-gray-200/40'
    }`}>
      <div className="flex items-center justify-center gap-2">
        <div className={`w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin`} />
        <span className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading {label}…</span>
      </div>
    </div>
  );
}

/* ── Date Filter ─────────────────────────────────────────────────────────── */

type DateFilter = 'all' | 7 | 30;

interface DateFilterProps {
  value: DateFilter;
  onChange: (value: DateFilter) => void;
  effectiveTheme: EffectiveTheme;
}

const DateFilter: React.FC<DateFilterProps> = ({ value, onChange, effectiveTheme }) => {
  const filters: { label: string; value: DateFilter }[] = [
    { label: 'All time', value: 'all' },
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
  ];

  const btnBase = 'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150';
  const activeClass = effectiveTheme === 'dark'
    ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/30'
    : 'bg-blue-500/20 text-blue-600 ring-1 ring-blue-500/30';
  const inactiveClass = effectiveTheme === 'dark'
    ? 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-gray-300'
    : 'bg-white/60 text-gray-500 hover:bg-gray-100/80 hover:text-gray-700';

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Show:</span>
      <div className="flex gap-1">
        {filters.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => onChange(f.value)}
            className={`${btnBase} ${value === f.value ? activeClass : inactiveClass}`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Main Dashboard ──────────────────────────────────────────────────────── */

export const SessionHistoryDashboard: React.FC<SessionHistoryDashboardProps> = ({
  sessions,
  stats,
  loading,
  errors,
  effectiveTheme,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group sessions by day, apply date filter
  const filteredSessions = useMemo(() => {
    const filtered = dateFilter === 'all'
      ? sessions
      : filterByDateRange(sessions, dateFilter);

    const groups: Record<string, WpmEntry[]> = {};
    for (const s of filtered) {
      const day = getDayGroup(s.timestamp);
      if (!groups[day]) groups[day] = [];
      groups[day].push(s);
    }
    return groups;
  }, [sessions, dateFilter]);

  const hasErrors = errors.sessions || errors.stats;

  return (
    <div className={`w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6 ${
      effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold ${effectiveTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            Session History
          </h2>
          <p className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <DateFilter value={dateFilter} onChange={setDateFilter} effectiveTheme={effectiveTheme} />
      </div>

      {/* Errors */}
      {hasErrors && (
        <div className={`rounded-xl border p-4 ${
          effectiveTheme === 'dark' ? 'bg-red-900/20 border-red-800/40 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <p className="text-sm font-medium">Failed to load history data.</p>
          {(errors.sessions || errors.stats) && (
            <p className="text-xs mt-1 opacity-80">{(errors.sessions || errors.stats)?.message}</p>
          )}
        </div>
      )}

      {/* Stats Overview */}
      {loading.stats ? (
        <LoadingState effectiveTheme={effectiveTheme} label="statistics" />
      ) : stats && sessions.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Sessions"
            value={stats.totalSessions}
            effectiveTheme={effectiveTheme}
          />
          <StatCard
            label="Avg WPM"
            value={Math.round(stats.avgWpm)}
            effectiveTheme={effectiveTheme}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            label="Peak WPM"
            value={stats.peakWpm}
            effectiveTheme={effectiveTheme}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
          />
          <StatCard
            label="Avg Accuracy"
            value={`${Math.round(stats.avgAccuracy)}%`}
            effectiveTheme={effectiveTheme}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* WPM Trend Chart */}
      {stats && stats.wpmTrend.length >= 2 && (
        <WpmTrendChart trend={stats.wpmTrend} effectiveTheme={effectiveTheme} />
      )}

      {/* Key Insights */}
      {stats && (stats.weakestKeys.length > 0 || stats.strongestKeys.length > 0) && (
        <KeyInsights stats={stats} effectiveTheme={effectiveTheme} />
      )}

      {/* Session List */}
      {loading.sessions ? (
        <LoadingState effectiveTheme={effectiveTheme} label="sessions" />
      ) : sessions.length === 0 ? (
        <EmptyState effectiveTheme={effectiveTheme} />
      ) : (
        <div className="space-y-3">
          {Object.entries(filteredSessions).map(([day, daySessions]) => (
            <div key={day}>
              <div className={`sticky top-0 z-10 px-1 py-1 text-xs font-semibold uppercase tracking-wider ${
                effectiveTheme === 'dark' ? 'bg-[#0D0D12]/90 text-gray-400' : 'bg-[#FAF9F6]/90 text-gray-500'
              }`}>
                {day} <span className="font-normal normal-case">({daySessions.length})</span>
              </div>
              <div className="space-y-2 mt-1">
                {daySessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    effectiveTheme={effectiveTheme}
                    expanded={expandedId === session.id}
                    onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
