// ============================================================================
// KetakKetik — Main Application Component
// ============================================================================

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useTheme } from '@app/hooks/useTheme';
import { useProfile } from '@app/hooks/useProfile';
import { useAudio } from '@app/hooks/useAudio';
import { loadCustomText } from '@app/utils/customText';
import { FINGER_LESSONS, TrainingMode } from '@app/utils/lessons';
import { useTypingSession } from '@app/hooks/useTypingSession';
import { Keyboard } from '@app/components/Keyboard';
import { MetricsPanel } from '@app/components/MetricPanel';
import { CompletionConfetti } from '@app/components/CompletionConfetti';
import { WpmGraph } from '@app/components/WpmGraph';
import { TrainingDisplay } from '@app/components/TrainingDisplay';
import { ProfileSwitcher } from '@app/components/ProfileSwitcher';
import { ThemeToggle } from '@app/components/ThemeToggle';
import { SoundSettings } from '@app/components/SoundSettings';
import type { EffectiveTheme as _EffectiveTheme } from '@app/types/ui';

export const App: React.FC = () => {
  const { mode, effectiveTheme, setMode } = useTheme();
  const { current, list, switchProfile, createProfile, deleteProfile } = useProfile();
  const { state: audioState, playKey, playFeedback, setProfile: setAudioProfile, setVolume: setAudioVolume } = useAudio();
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('practice');
  const [lessonIndex, setLessonIndex] = useState(0);
  const [customText, setCustomText] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [fileError, setFileError] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const fileRequestRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const session = useTypingSession(current.id, trainingMode, lessonIndex, customText);
  const selectTextFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++fileRequestRef.current;
    setFileLoading(true);
    setFileError('');
    try {
      const text = await loadCustomText(file);
      if (request !== fileRequestRef.current) return;
      setCustomText(text);
      setCustomFilename(file.name);
      session.reset();
      clearKeys();
      containerRef.current?.focus();
    } catch (error) {
      if (request === fileRequestRef.current) setFileError(error instanceof Error ? error.message : 'Unable to read this file.');
    } finally {
      if (request === fileRequestRef.current) setFileLoading(false);
    }
  };

  const completedSoundRef = useRef(false);
  const silentReleaseKeys = useRef(new Set<string>());
  useEffect(() => {
    if (session.stats.completedAt === null) {
      completedSoundRef.current = false;
    } else if (!completedSoundRef.current) {
      completedSoundRef.current = true;
      playFeedback('complete');
    }
  }, [session.stats.completedAt, playFeedback]);

  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const clearKeys = useCallback(() => {
    silentReleaseKeys.current.clear();
    setActiveKeys(new Set());
    setErrorKeys(new Set());
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    window.addEventListener('blur', clearKeys);
    return () => window.removeEventListener('blur', clearKeys);
  }, [clearKeys]);

  const restartLesson = () => {
    session.reset();
    clearKeys();
    containerRef.current?.focus();
  };
  const newLesson = () => {
    if (trainingMode === 'custom') { fileInputRef.current?.click(); return; }
    session.regenerate();
    clearKeys();
    containerRef.current?.focus();
  };

  // Keyboard event listeners
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement).closest('input, select, textarea, button, [contenteditable="true"]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!e.repeat && e.key.length === 1) {
        const key = e.key.toLowerCase();
        setActiveKeys(previous => new Set(previous).add(key));
        if (session.currentIndex < session.trainingString.length && key !== session.trainingString[session.currentIndex].toLowerCase()) {
          setErrorKeys(previous => new Set(previous).add(key));
          silentReleaseKeys.current.add(key);
          playFeedback('mistake');
        }
      }
      session.handleKeyDown(e);
      if (!e.repeat && e.key.length === 1) {
        if (!silentReleaseKeys.current.has(e.key.toLowerCase())) playKey(e.key, 'down');
      }
    },
    [session, playKey, playFeedback],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent): void => {
      const key = e.key.toLowerCase();
      const silentRelease = silentReleaseKeys.current.delete(key);
      setActiveKeys(previous => { const next = new Set(previous); next.delete(key); return next; });
      setErrorKeys(previous => { const next = new Set(previous); next.delete(key); return next; });
      if ((e.target as HTMLElement).closest('input, select, textarea, button, [contenteditable="true"]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      session.handleKeyUp(e);
      if (e.key.length === 1 && !silentRelease) {
        playKey(e.key, 'up');
      }
    },
    [session, playKey],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const bgClass = effectiveTheme === 'dark' ? 'bg-[#0D0D12]' : 'bg-[#FAF9F6]';
  const textClass = effectiveTheme === 'dark' ? 'text-[#E8E6E1]' : 'text-[#1A1A1A]';

  return (
    <div
      ref={containerRef}
      className={`${bgClass} ${textClass} min-h-screen flex flex-col`}
      tabIndex={0}
      role="main"
      aria-label="KetakKetik typing trainer"
    >
      <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" aria-label="Load custom text file" onChange={selectTextFile} />
      <CompletionConfetti completedAt={session.stats.completedAt} />
      {/* Header */}
      <header className={`sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 py-2 shrink-0 ${bgClass}`}>
        <ProfileSwitcher
          current={current}
          list={list}
          onSwitch={switchProfile}
          onCreate={createProfile}
          onDelete={deleteProfile}
          effectiveTheme={effectiveTheme}
        />

        <div className="order-last w-full md:order-none md:w-auto md:flex-1 min-w-0 flex flex-col items-center gap-2 md:max-w-xl">
          <ThemeToggle
            mode={mode}
            effectiveTheme={effectiveTheme}
            onToggle={setMode}
          />
          <div className={`w-full p-3 rounded-xl border ${effectiveTheme === 'dark' ? 'bg-gray-800/40 border-gray-700 text-gray-200' : 'bg-white/60 border-gray-200 text-gray-800'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium flex items-center gap-2">
                Mode
                <select aria-label="Training mode" value={trainingMode}
                  onChange={event => { setTrainingMode(event.target.value as TrainingMode); clearKeys(); }}
                  className="rounded-lg border border-gray-400/40 bg-transparent px-3 py-2">
                  <option value="practice">Practice</option>
                  <option value="lessons">Lessons</option>
                  <option value="custom">Custom text</option>
                </select>
              </label>
              {trainingMode === 'custom' && (
                <div className="min-w-0 flex-1">
                  <button onClick={() => fileInputRef.current?.click()} disabled={fileLoading} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-50">{fileLoading ? 'Loading…' : 'Load text file'}</button>
                  <p className="text-xs mt-1 truncate" title={customFilename}>{customFilename || 'Choose a UTF-8 .txt file (up to 1 MB)'}</p>
                  {fileError && <p role="alert" className="text-sm text-red-500 mt-1">{fileError}</p>}
                </div>
              )}
              {trainingMode === 'lessons' && (
                <label className="text-sm flex-1 min-w-0 flex items-center gap-2">
                  Lesson
                  <select aria-label="Finger lesson" value={lessonIndex}
                    onChange={event => { setLessonIndex(Number(event.target.value)); clearKeys(); }}
                    className="min-w-0 flex-1 rounded-lg border border-gray-400/40 bg-transparent px-2 py-2">
                    {FINGER_LESSONS.map((lesson, index) => <option key={lesson.id} value={index}>{index + 1}. {lesson.title}</option>)}
                  </select>
                </label>
              )}
            </div>
            {trainingMode === 'lessons' && <p className="mt-2 text-xs opacity-75">{FINGER_LESSONS[lessonIndex].instruction} Complete this drill, then choose Next lesson to increase the challenge.</p>}
          </div>
        </div>

        <SoundSettings
          activeProfile={audioState.activeProfile.name as 'clicky' | 'tactile' | 'linear'}
          volume={audioState.volume}
          onProfileChange={setAudioProfile}
          onVolumeChange={setAudioVolume}
          effectiveTheme={effectiveTheme}
        />
      </header>

      {/* Main area */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 p-4">
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center max-w-4xl w-full">
          <WpmGraph
            samples={session.wpmHistory}
            currentWpm={session.stats.currentWpm}
            effectiveTheme={effectiveTheme}
            completed={session.stats.completedAt !== null}
          />
          {trainingMode === 'custom' && !customText && <p className="w-full text-center py-6 text-sm opacity-75">Load a text file above to start your custom typing session. Files stay on this device.</p>}
          <TrainingDisplay
            finalWpm={session.stats.averageWpm}
            trainingString={session.trainingString}
            currentIndex={session.currentIndex}
            charStates={session.charStates}
            effectiveTheme={effectiveTheme}
            isSessionActive={session.isSessionActive}
          />

          {/* Keyboard */}
          <div className="w-full max-w-4xl mt-4">
            <Keyboard
              activeKeys={activeKeys}
              errorKeys={errorKeys}
              weakKeys={trainingMode === 'lessons' ? FINGER_LESSONS[lessonIndex].keys : session.weakKeys.map((wk) => wk.key)}
              effectiveTheme={effectiveTheme}
            />
          </div>
        </div>

        {/* Metrics panel (desktop only) */}
        <div className="hidden md:block shrink-0">
          <MetricsPanel
            stats={session.stats}
            effectiveTheme={effectiveTheme}
            isSessionActive={session.isSessionActive}
            onNextLesson={trainingMode === 'lessons' && session.stats.completedAt !== null && lessonIndex < FINGER_LESSONS.length - 1 ? () => {
              setLessonIndex(index => index + 1); clearKeys(); containerRef.current?.focus();
            } : undefined}
            newLessonLabel={trainingMode === 'custom' ? 'Load text file' : 'New lesson'}
            progress={session.trainingString.length ? session.currentIndex / session.trainingString.length : 0}
            onRestart={restartLesson}
            onRegenerate={newLesson}
          />
        </div>
      </main>

      {/* Mobile metrics */}
      <div className="md:hidden px-4 py-2 shrink-0">
        <div className={`flex flex-wrap gap-2 items-center justify-around text-center text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          {trainingMode === 'lessons' && session.stats.completedAt !== null && lessonIndex < FINGER_LESSONS.length - 1 && (
            <button className="px-3 py-1 rounded-md bg-blue-600 text-white" onClick={() => { setLessonIndex(index => index + 1); clearKeys(); containerRef.current?.focus(); }}>Next lesson</button>
          )}
          <span>WPM: <strong className={textClass}>{session.stats.currentWpm}</strong></span>
          <span>Acc: <strong className={textClass}>{session.stats.accuracy}%</strong></span>
          <span>Errors: <strong className={textClass}>{session.stats.totalErrors}</strong></span>
          <button
            onClick={restartLesson}
            className="px-3 py-1 rounded-md text-xs font-medium border border-blue-400 text-blue-500"
          >
            Restart session
          </button>
          <button
            onClick={newLesson}
            className={`px-3 py-1 rounded-md text-xs font-medium ${
              effectiveTheme === 'dark'
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
            } transition-all duration-150`}
          >
            {trainingMode === 'custom' ? 'Load text file' : 'New lesson'}
          </button>
        </div>
      </div>
    </div>
  );
};
