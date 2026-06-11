/** Design tokens — AMB-DMP-2026 */
export const Colors = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: 'rgba(99,102,241,0.12)',
  secondary: '#10b981',
  secondaryLight: 'rgba(16,185,129,0.12)',
  warning: '#f59e0b',
  warningLight: 'rgba(245,158,11,0.12)',
  danger: '#ef4444',
  dangerLight: 'rgba(239,68,68,0.12)',
  info: '#06b6d4',
  infoLight: 'rgba(6,182,212,0.12)',

  bgPrimary: '#f8fafc',
  bgSecondary: '#ffffff',
  bgTertiary: '#f1f5f9',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  border: '#e2e8f0',
  borderHover: '#cbd5e1',

  white: '#ffffff',
  black: '#000000',
};

export const Typography = {
  fontFamily: 'System',
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 22,
  xxl: 28,
  xxxl: 34,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
};
