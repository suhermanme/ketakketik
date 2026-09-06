// ============================================================================
// KetakKetik — Profile Switcher Component
// ============================================================================

import React, { useState } from 'react';
import { Profile } from '@app/types/ui';
import type { EffectiveTheme } from '@app/types/ui';

export interface ProfileSwitcherProps {
  current: Profile;
  list: Profile[];
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  effectiveTheme: EffectiveTheme;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  current,
  list,
  onSwitch,
  onCreate,
  onDelete,
  effectiveTheme,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');

  const dropdownBg = effectiveTheme === 'dark' ? 'bg-gray-800/90' : 'bg-white/90';
  const dropdownBorder = effectiveTheme === 'dark' ? 'border-gray-700/40' : 'border-gray-300/40';
  const hoverBg = effectiveTheme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/60';

  const handleCreate = (): void => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName('');
      setShowCreate(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5
          rounded-lg
          ${effectiveTheme === 'dark'
            ? 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-200'
            : 'bg-white/60 hover:bg-white/80 text-gray-800'}
          border ${effectiveTheme === 'dark' ? 'border-gray-700/30' : 'border-gray-300/30'}
          transition-all duration-150
        `}
        aria-label="Profile switcher"
        aria-expanded={isOpen}
      >
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center
          text-xs font-bold
          ${effectiveTheme === 'dark' ? 'bg-blue-500/40 text-blue-200' : 'bg-blue-500/30 text-blue-700'}
        `}>
          {current.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium">{current.name}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5l7 7l7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`
          absolute top-full left-0 mt-2 w-48
          rounded-xl shadow-lg
          ${dropdownBg}
          border ${dropdownBorder}
          z-50
          animate-panel-slide
        `}>
          <div className="p-2 space-y-1">
            {list.map((profile) => (
              <button
                key={profile.id}
                onClick={() => {
                  onSwitch(profile.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2
                  rounded-lg text-left
                  ${hoverBg}
                  transition-all duration-150
                `}
              >
                <div className={`
                  w-2 h-2 rounded-full
                  ${profile.id === current.id
                    ? 'bg-green-400'
                    : effectiveTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'}
                `} />
                <span className={`
                  text-sm flex-1
                  ${profile.id === current.id
                    ? effectiveTheme === 'dark'
                      ? 'text-gray-100 font-semibold'
                      : 'text-gray-900 font-semibold'
                    : effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
                `}>
                  {profile.name}
                </span>
                {list.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(profile.id);
                    }}
                    className={`
                      w-4 h-4 flex items-center justify-center text-xs
                      ${effectiveTheme === 'dark' ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}
                      transition-color duration-150
                    `}
                    aria-label={`Delete ${profile.name}`}
                  >
                    ×
                  </button>
                )}
              </button>
            ))}
          </div>

          <div className={`border-t ${effectiveTheme === 'dark' ? 'border-gray-700/30' : 'border-gray-300/30'} p-2`}>
            {showCreate ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Profile name"
                  className={`
                    w-full px-2 py-1.5 text-sm rounded-lg
                    ${effectiveTheme === 'dark'
                      ? 'bg-gray-700/40 text-gray-200 border-gray-600/40'
                      : 'bg-gray-100/60 text-gray-800 border-gray-300/40'}
                    border focus:outline-none
                    focus:ring-1 focus:ring-blue-500/40
                  `}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') setShowCreate(false);
                  }}
                />
                <div className="flex gap-1">
                  <button onClick={handleCreate} className="px-2 py-1 text-xs bg-green-500/30 text-green-400 rounded">
                    Create
                  </button>
                  <button onClick={() => setShowCreate(false)} className={`px-2 py-1 text-xs ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className={`
                  w-full px-3 py-2 text-sm
                  ${effectiveTheme === 'dark' ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50/10'}
                  rounded-lg transition-all duration-150
                `}
              >
                + New Profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
