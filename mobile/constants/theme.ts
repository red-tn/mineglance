// MineGlance Theme (matches extension v1.0.6)

// Dark Mode Colors (default)
export const darkColors = {
  // Primary (green accent)
  primary: '#38a169',
  primaryLight: '#48bb78',

  // Accent (green)
  accent: '#38a169',
  accentLight: '#48bb78',

  // Status colors
  danger: '#f56565',
  warning: '#ecc94b',
  success: '#38a169',

  // Backgrounds (dark mode)
  background: '#0a0a0a',
  cardBackground: '#141414',
  cardHover: '#1a1a1a',

  // Text (dark mode)
  text: '#f5f5f5',
  textMuted: '#9ca3af',
  textLight: '#6b7280',

  // Borders (dark mode)
  border: '#2a2a2a',

  // Pro badge (green)
  proBadgeStart: '#4ade80',
  proBadgeEnd: '#38a169',

  // Status indicators
  online: '#38a169',
  offline: '#f56565',

  // Glow effect color
  glow: 'rgba(56, 161, 105, 0.3)',
};

// Lite Mode Colors (light theme)
export const liteColors = {
  // Primary (green accent)
  primary: '#38a169',
  primaryLight: '#48bb78',

  // Accent (green)
  accent: '#38a169',
  accentLight: '#48bb78',

  // Status colors
  danger: '#f56565',
  warning: '#ecc94b',
  success: '#38a169',

  // Backgrounds (lite mode)
  background: '#f7fafc',
  cardBackground: '#ffffff',
  cardHover: '#f1f5f9',

  // Text (lite mode)
  text: '#1a202c',
  textMuted: '#4a5568',
  textLight: '#718096',

  // Borders (lite mode)
  border: '#e2e8f0',

  // Pro badge (green)
  proBadgeStart: '#4ade80',
  proBadgeEnd: '#38a169',

  // Status indicators
  online: '#38a169',
  offline: '#f56565',

  // Glow effect color
  glow: 'rgba(56, 161, 105, 0.15)',
};

// Default export (dark mode for backwards compatibility)
export const colors = darkColors;

// Get theme colors based on lite mode setting
export const getColors = (liteMode: boolean) => liteMode ? liteColors : darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  '2xl': 24,
  '3xl': 30,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Default settings
export const defaults = {
  refreshInterval: 30, // 30 minutes (user requested)
  currency: 'USD',
};
