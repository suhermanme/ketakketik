// ============================================================================
// KetakKetik — Metrics Panel Component
// ============================================================================

import React from 'react';
import { SessionStats } from '@app/types/typing';
import { EffectiveTheme } from '@app/types/ui';

interface MetricsPanelProps {
  stats: SessionStats;
  effectiveTheme: EffectiveTheme;
  isSessionActive: boolean;
  progress: number;
  newLessonLabel?: string;
  onNextLesson?: () => void;
  onRestart: () => void;
  onRegenerate: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  effectiveTheme: EffectiveTheme;
  highlight?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sublabel,
  effectiveTheme,
  highlight = false,
}) => (
  <div
    className={`
      rounded-lg p-3 sm:p-4
      ${effectiveTheme === 'dark'
        ? 'bg-gray-800/60 border border-gray-700/40'
        : 'bg-white/80 border border-gray-200/60'}
      ${highlight ? 'ring-2 ring-blue-500/40' : ''}
    `}
  >
    <div className={`text-xs uppercase tracking-wider font-medium ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
      {label}
    </div>
    <div className={`text-2xl sm:text-3xl font-bold mt-1 ${effectiveTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
      {value}
    </div>
    {sublabel && (
      <div className={`text-xs mt-0.5 ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{sublabel}</div>
    )}
  </div>
);

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  stats,
  effectiveTheme,
  isSessionActive,
  progress,
  newLessonLabel = 'New lesson',
  onNextLesson,
  onRestart,
  onRegenerate,
}) => {
  const bgColor = effectiveTheme === 'dark' ? 'bg-gray-900/90' : 'bg-gray-50/80';
  const borderColor = effectiveTheme === 'dark' ? 'border-gray-700/40' : 'border-gray-300/40';

  return (
    <div
      className={`
        w-full md:w-[320px] md:min-w-[320px]
        ${bgColor}
        border-l ${borderColor}
        overflow-y-auto scrollbar-thin
        ${isSessionActive ? 'animate-panel-slide' : ''}
      `}
    >
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
          <h2 className={`text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Session
          </h2>
        </div>

        <div className="flex flex-col gap-2" aria-label="Lesson controls">
          {onNextLesson && <button onClick={onNextLesson} className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">Next lesson</button>}
          <button
            onClick={onRegenerate}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {newLessonLabel}
          </button>
          <button
            onClick={onRestart}
            className={`w-full px-4 py-2 text-sm font-medium rounded-lg border border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 ${effectiveTheme === 'dark' ? 'text-blue-300 bg-gray-800' : 'text-blue-600 bg-white'}`}
          >
            Restart session
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="WPM" value={stats.currentWpm} sublabel="current" effectiveTheme={effectiveTheme} highlight={isSessionActive} />
          <MetricCard label="Accuracy" value={`${stats.accuracy}%`} sublabel="precision" effectiveTheme={effectiveTheme} highlight={isSessionActive} />
          <MetricCard label="Peak WPM" value={stats.peakWpm} sublabel="highest" effectiveTheme={effectiveTheme} />
          <MetricCard label="Avg WPM" value={stats.averageWpm} sublabel="overall" effectiveTheme={effectiveTheme} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Errors" value={stats.totalErrors} sublabel="mistakes" effectiveTheme={effectiveTheme} />
          <MetricCard label="Keystrokes" value={stats.totalKeystrokes} sublabel="total" effectiveTheme={effectiveTheme} />
        </div>

        <div className={`rounded-lg p-3 ${effectiveTheme === 'dark' ? 'bg-gray-800/40' : 'bg-white/60'}`}>
          <div className={`text-xs uppercase tracking-wider font-medium ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Duration
          </div>
          <div className={`text-xl font-bold mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            {formatDuration(stats.durationMs)}
          </div>
        </div>

        {stats.totalKeystrokes > 0 && (
          <div>
            <div className={`text-xs uppercase tracking-wider font-medium mb-2 ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Progress
            </div>
            <div className={`w-full h-2 rounded-full ${effectiveTheme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200/60'}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-width duration-300"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
          </div>
        )}


      </div>
    </div>
  );
};
