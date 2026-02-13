/**
 * Centralized theme palettes for dark and light modes.
 */

export type ThemeMode = 'dark' | 'light';

export const DARK_THEME = {
  background: '#0f172a',
  backgroundLighter: '#1e293b',
  accent: '#3b82f6',
  textPrimary: '#fff',
  textSecondary: 'rgba(255, 255, 255, 0.9)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  cardBg: 'rgba(255, 255, 255, 0.1)',
  cardBgElevated: 'rgba(255, 255, 255, 0.15)',
  borderDefault: 'rgba(255, 255, 255, 0.2)',
  borderFocus: 'rgba(255, 255, 255, 0.4)',
  live: '#ef4444',
  upcoming: '#f59e0b',
  completed: '#22c55e',
  // Scoring panel
  scoringBg: '#1a1a2e',
  gridButton: '#16213e',
  gridButtonBorder: '#2a3a5c',
  boundary: '#166534',
  boundaryBorder: '#22c55e',
  undo: '#78350f',
  undoBorder: '#f59e0b',
  extras: '#581c87',
  extrasBorder: '#a855f7',
  wicket: '#dc2626',
  strikeHighlight: 'rgba(245, 158, 11, 0.15)',
  strikeBorder: '#f59e0b',
  selected: 'rgba(34, 197, 94, 0.15)',
  selectedBorder: '#22c55e',
  modalBg: '#1e293b',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

export const LIGHT_THEME = {
  background: '#f8fafc',
  backgroundLighter: '#f1f5f9',
  accent: '#3b82f6',
  textPrimary: '#1e293b',
  textSecondary: '#334155',
  textTertiary: '#64748b',
  cardBg: '#fff',
  cardBgElevated: '#fff',
  borderDefault: '#e2e8f0',
  borderFocus: '#94a3b8',
  live: '#ef4444',
  upcoming: '#f59e0b',
  completed: '#22c55e',
  // Scoring panel
  scoringBg: '#fff',
  gridButton: '#f8f9fa',
  gridButtonBorder: '#e0e0e0',
  boundary: '#e8f5e9',
  boundaryBorder: '#4caf50',
  undo: '#fff3e0',
  undoBorder: '#ff9800',
  extras: '#f3e5f5',
  extrasBorder: '#9c27b0',
  wicket: '#FF3B30',
  strikeHighlight: '#fff9f0',
  strikeBorder: '#FF9500',
  selected: '#f0fdf4',
  selectedBorder: '#34C759',
  modalBg: '#fff',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
};

export type ThemeColors = typeof DARK_THEME;

/** Legacy export for gradual migration. Maps to DARK_THEME. */
export const COLORS = {
  DARK_TEAL: DARK_THEME.background,
  DARK_TEAL_LIGHTER: DARK_THEME.backgroundLighter,
  ACCENT: DARK_THEME.accent,
  MINT: DARK_THEME.accent,
  TEXT_PRIMARY: DARK_THEME.textPrimary,
  TEXT_SECONDARY: DARK_THEME.textSecondary,
  TEXT_TERTIARY: DARK_THEME.textTertiary,
  CARD_BG: DARK_THEME.cardBg,
  CARD_BG_ELEVATED: DARK_THEME.cardBgElevated,
  BORDER_DEFAULT: DARK_THEME.borderDefault,
  BORDER_FOCUS: DARK_THEME.borderFocus,
  LIVE: DARK_THEME.live,
  UPCOMING: DARK_THEME.upcoming,
  COMPLETED: DARK_THEME.completed,
};
