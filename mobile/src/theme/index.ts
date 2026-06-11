/** Design tokens — AMB-DMP-2026 */
export const Colors = {
  primary: '#4f46e5',        // Modern Indigo
  primaryDark: '#3730a3',    // Deep Indigo
  primaryLight: '#f5f3ff',   // Very Soft Lavender
  secondary: '#059669',      // Premium Emerald Green
  secondaryLight: '#ecfdf5', // Soft Mint
  warning: '#d97706',        // Amber
  warningLight: '#fef3c7',   // Soft Amber
  danger: '#dc2626',         // Coral Red
  dangerLight: '#fee2e2',    // Soft Coral
  info: '#0d9488',           // Teal
  infoLight: '#f0fdfa',      // Soft Teal

  bgPrimary: '#f8fafc',      // Cool Slate Gray Light
  bgSecondary: '#ffffff',    // White
  bgTertiary: '#f1f5f9',     // Light gray border/bg

  textPrimary: '#0f172a',    // Dark Slate
  textSecondary: '#334155',  // Medium Slate
  textMuted: '#64748b',      // Cool Gray Muted

  border: '#e2e8f0',         // Soft borders
  borderHover: '#cbd5e1',

  white: '#ffffff',
  black: '#000000',
};

export const Typography = {
  fontFamily: 'System',
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,
};

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 6,
  },
};
