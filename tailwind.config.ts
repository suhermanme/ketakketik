import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/src/**/*.{ts,tsx}',
    './app/components/**/*.{ts,tsx}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        // Light theme
        'bg-light': '#FAF9F6',
        'text-light': '#1A1A1A',
        'accent-light': '#2D5C8A',
        // Dark theme
        'bg-dark': '#0D0D12',
        'text-dark': '#E8E6E1',
        'accent-dark': '#6B9ACA',
        // Correct feedback
        'correct-light': '#4A8A5C',
        'correct-dark': '#6BC47A',
        // Error feedback
        'error-light': '#C44A3A',
        'error-dark': '#E86B5A',
        // Cursor
        'cursor-light': '#2D5C8A',
        'cursor-dark': '#6B9ACA',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'error-flash': 'error-flash 0.3s ease-in-out',
        'error-shake': 'error-shake 0.3s ease-in-out',
        'char-correct': 'char-correct 0.2s ease-out',
        'char-fade': 'char-fade 0.15s ease-in',
        'panel-slide': 'panel-slide 0.25s ease-out',
      },
      keyframes: {
        'cursor-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        'error-flash': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'var(--error-bg, #C44A3A)' },
        },
        'error-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'char-correct': {
          '0%': { color: 'var(--correct-fg, #4A8A5C)' },
          '100%': { color: 'inherit' },
        },
        'char-fade': {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'panel-slide': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      transitionProperty: {
        all: 'all',
      },
      borderRadius: {
        '4xl': '1.75rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
