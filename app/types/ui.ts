// ============================================================================
// KetakKetik — UI Domain Types
// ============================================================================

/** Theme mode selection */
export type ThemeMode = 'light' | 'dark' | 'auto';

/** Computed effective theme */
export type EffectiveTheme = 'light' | 'dark';

/** Responsive breakpoint values */
export interface ResponsiveBreakpoint {
  mobile: number;
  tablet: number;
  desktop: number;
}

/** Current responsive breakpoint */
export type ResponsiveMode = 'mobile' | 'tablet' | 'desktop';

/** Theme configuration for CSS variables */
export interface ThemeConfig {
  bg: string;
  bgSecondary: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  correct: string;
  error: string;
  cursor: string;
  border: string;
  panelBg: string;
  panelBorder: string;
  pending: string;
  current: string;
  complete: string;
  faded: string;
  shadow: string;
}

/** Theme map for both modes */
export interface ThemeMap {
  light: ThemeConfig;
  dark: ThemeConfig;
}

/** Profile interface for persistence */
export interface Profile {
  id: string;
  name: string;
  avatar: string;
  theme: ThemeMode;
  createdAt: number;
  lastActive: number;
  active: boolean;
}

/** Settings state */
export interface AppSettings {
  themeMode: ThemeMode;
  soundProfile: 'clicky' | 'tactile' | 'linear';
  volume: number;
  sessionLength: number;
  showKeyVisualizer: boolean;
  showMetricsPanel: boolean;
  showProgressChart: boolean;
  showWeakKeyIndicator: boolean;
}

/** Default application settings */
export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'auto',
  soundProfile: 'clicky',
  volume: 0.8,
  sessionLength: 175,
  showKeyVisualizer: true,
  showMetricsPanel: true,
  showProgressChart: true,
  showWeakKeyIndicator: true,
};

/** Metric display type */
export type MetricType = 'wpm' | 'accuracy' | 'errors' | 'duration';

/** Chart data point */
export interface ChartDataPoint {
  label: string;
  wpm: number;
  accuracy: number;
  date: string;
}
