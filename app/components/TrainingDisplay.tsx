// ============================================================================
// KetakKetik — Training Display Component
// ============================================================================

import React, { useMemo, useRef, useEffect } from 'react';
import { CharState } from '@app/types/typing';
import { EffectiveTheme } from '@app/types/ui';

export interface TrainingDisplayProps {
  finalWpm: number;
  trainingString: string;
  currentIndex: number;
  charStates: CharState[];
  effectiveTheme: EffectiveTheme;
  isSessionActive: boolean;
}

function getCharClass(state: CharState, effectiveTheme: EffectiveTheme): string {
  switch (state) {
    case 'PENDING':
      return effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-400';
    case 'CURRENT':
      return effectiveTheme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    case 'CORRECT':
      return effectiveTheme === 'dark' ? 'text-green-400' : 'text-green-600';
    case 'ERROR':
      return 'text-red-500 animate-error-flash';
    case 'COMPLETE':
      return effectiveTheme === 'dark' ? 'text-green-400/40' : 'text-green-600/40';
    case 'FADED':
      return effectiveTheme === 'dark' ? 'text-green-400/20' : 'text-green-600/20';
    default:
      return effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-400';
  }
}

export const TrainingDisplay: React.FC<TrainingDisplayProps> = ({
  finalWpm,
  trainingString,
  currentIndex,
  charStates,
  effectiveTheme,
  isSessionActive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (currentIndex === 0) {
      container.scrollTop = 0;
      return;
    }
    const cursor = container.querySelector<HTMLElement>('[data-current="true"]');
    if (!cursor) return;
    const top = cursor.getBoundingClientRect().top - container.getBoundingClientRect().top;
    if (top < 0) container.scrollTop += top;
    else if (top + cursor.offsetHeight > container.clientHeight) {
      container.scrollTop += top + cursor.offsetHeight - container.clientHeight;
    }
  }, [currentIndex, trainingString]);

  const chars = useMemo(() => {
    const characters = trainingString.split('').map((char, i) => {
      const state = charStates[i] ?? 'PENDING';
      const isCurrent = i === currentIndex;
      const isSpace = char === ' ';

      return (
        <span
          key={i}
          data-current={isCurrent}
          className={`
            relative inline-block
            text-2xl sm:text-3xl md:text-4xl
            font-mono leading-relaxed
            ${getCharClass(state, effectiveTheme)}
            ${isCurrent ? 'cc-cursor-blink' : ''}
          `}
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Mono', 'Menlo', monospace",
            minWidth: isSpace ? '1rem' : undefined,
          }}
        >
          {isSpace ? '\u00A0' : char}
          {isCurrent && (
            <span
              className={`
                absolute -bottom-1 left-0 right-0 h-[3px]
                ${effectiveTheme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'}
                rounded-full
              `}
            />
          )}
        </span>
      );
    });
    let offset = 0;
    return trainingString.split(' ').map((word, wordIndex, words) => {
      const start = offset;
      offset += word.length + 1;
      return (
        <React.Fragment key={start}>
          <span className="inline-block whitespace-nowrap" data-word={word}>
            {characters.slice(start, start + word.length)}
          </span>
          {wordIndex < words.length - 1 && <>{characters[start + word.length]}<wbr /></>}
        </React.Fragment>
      );
    });
  }, [trainingString, charStates, currentIndex, effectiveTheme]);

  return (
    <div
      className={`
        relative w-full max-w-4xl mx-auto
        rounded-xl p-4 sm:p-6
        overflow-hidden
        ${effectiveTheme === 'dark'
          ? 'bg-gray-800/40 border border-gray-700/30'
          : 'bg-white/60 border border-gray-200/40'}
        ${isSessionActive ? 'animate-panel-slide' : ''}
      `}
    >
      <div
        className={`
          absolute inset-0 opacity-5
          ${effectiveTheme === 'dark' ? 'bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)]' : 'bg-[radial-gradient(circle_at_1px_1px,#000_1px,transparent_0)]'}
          bg-[length:24px_24px]
        `}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        className="
          relative z-10
          font-mono
          text-2xl sm:text-3xl md:text-4xl
          leading-relaxed
          whitespace-normal
          break-normal
          overflow-y-auto
          overflow-x-hidden
          scrollbar-thin
          max-h-[30vh]
          py-4
        "
        role="textbox"
        aria-label="Training text"
        tabIndex={0}
      >
        {chars}
      </div>

      {currentIndex >= trainingString.length && trainingString.length > 0 && (
        <div className={`
          absolute inset-0 flex items-center justify-center
          ${effectiveTheme === 'dark' ? 'bg-gray-900/60' : 'bg-white/60'}
          backdrop-blur-sm z-20
        `}>
          <div className="text-center">
            <div className={`text-4xl font-bold mb-2 ${effectiveTheme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              Complete!
            </div>
            <div className={`text-lg ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Final WPM: {finalWpm}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
