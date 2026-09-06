import React from 'react';
import type { WpmSample } from '@app/types/typing';
import type { EffectiveTheme } from '@app/types/ui';

interface WpmGraphProps {
  samples: WpmSample[];
  currentWpm: number;
  effectiveTheme: EffectiveTheme;
  completed: boolean;
}

/** Session-average WPM over elapsed time, matching the Session panel. */
export const WpmGraph: React.FC<WpmGraphProps> = ({ samples, currentWpm, effectiveTheme, completed }) => {
  const dark = effectiveTheme === 'dark';
  const width = 640;
  const left = 38;
  const right = 624;
  const top = 10;
  const bottom = 106;
  const maxTime = Math.max(30000, samples[samples.length - 1]?.elapsedMs ?? 0);
  const maxWpm = Math.max(60, Math.ceil(Math.max(0, ...samples.map(sample => sample.wpm)) / 20) * 20);
  const x = (ms: number) => left + ms / maxTime * (right - left);
  const y = (wpm: number) => bottom - wpm / maxWpm * (bottom - top);
  const points = samples.map(sample => `${x(sample.elapsedMs)},${y(sample.wpm)}`).join(' ');
  const last = samples[samples.length - 1];

  return (
    <section className={`w-full mb-3 rounded-xl border px-4 py-3 ${dark ? 'bg-gray-800/40 border-gray-700/30 text-gray-400' : 'bg-white/60 border-gray-200/40 text-gray-500'}`} aria-label="WPM history">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider">{completed ? 'Session WPM' : 'Live WPM'}</span>
        <span><strong className={`text-lg tabular-nums ${dark ? 'text-blue-300' : 'text-blue-600'}`}>{currentWpm}</strong> WPM</span>
      </div>
      <svg viewBox={`0 0 ${width} 132`} className="w-full h-auto max-h-36" role="img" aria-label={`Typing speed over time. Current speed ${currentWpm} words per minute.`}>
        <title>Words per minute over elapsed time</title>
        {[0, maxWpm / 2, maxWpm].map(value => (
          <g key={value}>
            <line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 4" />
            <text x={left - 8} y={y(value) + 4} textAnchor="end" fill="currentColor" fontSize="10">{value}</text>
          </g>
        ))}
        {[0, maxTime / 2, maxTime].map(ms => (
          <text key={ms} x={x(ms)} y="125" textAnchor={ms === maxTime ? 'end' : ms === 0 ? 'start' : 'middle'} fill="currentColor" fontSize="10">{Math.round(ms / 1000)}s</text>
        ))}
        {last ? (
          <g className={dark ? 'text-blue-400' : 'text-blue-600'}>
            <polygon points={`${x(samples[0].elapsedMs)},${bottom} ${points} ${x(last.elapsedMs)},${bottom}`} fill="currentColor" opacity="0.08" />
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(last.elapsedMs)} cy={y(last.wpm)} r="3" fill="currentColor" />
          </g>
        ) : <text x="330" y="62" textAnchor="middle" fill="currentColor" fontSize="12">Start typing to see your pace</text>}
      </svg>
    </section>
  );
};
