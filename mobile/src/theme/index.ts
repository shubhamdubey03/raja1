/** Design tokens — AMB-DMP-2026 */
export const Colors = {
  // Brand Colors (Figma Gold/Olive Accent)
  primary: '#725B00',        // Dark Gold/Olive
  primaryDark: '#4E3E00',    // Deeper Gold/Brown
  primaryLight: '#FFF9E6',   // Warm soft gold tint
  
  // Secondary / Accent (Figma Golden Yellow)
  secondary: '#FDD65B',      // Bright Golden Yellow
  secondaryLight: '#FFFDF2', // Very light gold tint
  
  // Semantic Colors
  success: '#23501D',        // Figma Dark Green
  successLight: '#EAF2E8',   // Light green tint
  warning: '#E8C349',        // Golden Yellow
  warningLight: '#FFFDF2',
  error: '#BA1A1A',          // Figma Deep Red
  errorLight: '#FFDAD6',     // Figma Light Red/Rose
  info: '#6B7280',           // Gray
  infoLight: '#F0EDEB',      // Warm light gray
 
  // Surface Colors
  bgPrimary: '#FDF8F8',      // Page Background (warm off-white/beige)
  bgSecondary: '#FFFFFF',    // Secondary background
  bgCard: '#FFFFFF',         // Cards
  bgInput: '#F6F2F2',        // Input fields (soft warm gray)
  
  // Text Colors
  textPrimary: '#1A1A1A',    // Very dark charcoal
  textSecondary: '#444648',  // Dark slate gray
  textMuted: '#747777',      // Medium gray
 
  // Borders
  border: '#C3C6C6',         // Soft borders
  borderFocused: '#725B00',  // Focused input border color
 
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Typography = {
  fontFamily: 'System', // Using System for iOS/Android defaults which looks similar to Inter
  
  // Type Scale
  heading: 28,
  subheading: 20,
  body: 16,
  caption: 14,
  label: 12,
  
  // Compiler helper aliases
  xs: 10,
  sm: 14,
  base: 16,

  // Weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
  }
};

// 4pt Grid System
export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,    // Standard padding
  lg: 20,    // Card padding
  xl: 24,    // Section gap
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 8,     // Buttons
  md: 12,    // Cards
  lg: 24,    // Chips/tags
  full: 9999, // FABs and avatars
};

export const Shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3, // For Android
  },
  fab: {
    shadowColor: '#725B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  }
};
