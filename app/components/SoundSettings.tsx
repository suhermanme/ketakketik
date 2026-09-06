// ============================================================================
// KetakKetik — Sound Settings Component
// ============================================================================

import React from 'react';
import { EffectiveTheme } from '@app/types/ui';

export interface SoundSettingsProps {
  activeProfile: 'clicky' | 'tactile' | 'linear';
  volume: number;
  onProfileChange: (profile: 'clicky' | 'tactile' | 'linear') => void;
  onVolumeChange: (volume: number) => void;
  effectiveTheme: EffectiveTheme;
}

const SOUND_PROFILES: Array<{
  id: 'clicky' | 'tactile' | 'linear';
  name: string;
  description: string;
}> = [
  { id: 'clicky', name: 'Clicky', description: 'Cherry MX Blue' },
  { id: 'tactile', name: 'Tactile', description: 'Cherry MX Brown' },
  { id: 'linear', name: 'Linear', description: 'Cherry MX Red' },
];

export const SoundSettings: React.FC<SoundSettingsProps> = ({
  activeProfile,
  volume,
  onProfileChange,
  onVolumeChange,
  effectiveTheme,
}) => {
  const cardBg = effectiveTheme === 'dark'
    ? 'bg-gray-800/40 border-gray-700/30'
    : 'bg-white/60 border-gray-300/30';
  const textSecondary = effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`rounded-xl p-3 border w-full sm:w-80 ${cardBg}`}>
      <h3 className={`text-xs uppercase tracking-wider font-semibold mb-2 ${textSecondary}`}>
        Sound Profile
      </h3>

      <div className="flex gap-2 mb-2">
        {SOUND_PROFILES.map((sp) => (
          <button
            key={sp.id}
            onClick={() => onProfileChange(sp.id)}
            className={`
              flex-1 px-2 py-2 text-center rounded-lg border transition-all duration-150
              ${activeProfile === sp.id
                ? effectiveTheme === 'dark'
                  ? 'bg-blue-500/30 text-blue-300 border-blue-500/40'
                  : 'bg-blue-500/20 text-blue-700 border-blue-500/40'
                : effectiveTheme === 'dark'
                  ? 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50 border-gray-700/30'
                  : 'bg-gray-100/40 text-gray-500 hover:bg-gray-100/60 border-gray-300/30'}
            `}
          >
            <div className="text-xs font-medium">{sp.name}</div>
            <div className={`text-[10px] mt-0.5 ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {sp.description}
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className={`text-xs ${textSecondary}`}>Volume</div>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          className="min-w-0 flex-1 accent-blue-500"
          aria-label="Volume"
        />
        <div className={`text-xs ${textSecondary}`}>
          {Math.round(volume * 100)}%
        </div>
      </div>
    </div>
  );
};
