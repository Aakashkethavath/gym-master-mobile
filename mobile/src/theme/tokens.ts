import { Platform } from 'react-native';

export const palette = {
  // Backgrounds
  bg: '#0D0D0D',
  surface: '#161616',
  surface2: '#1F1F1F',
  surface3: '#2A2A2A',

  // Borders
  border: '#2C2C2C',
  borderStrong: '#3D3D3D',

  // Text
  ink: '#F0F0ED',
  inkSecondary: '#A0A09C',
  inkMuted: '#616160',

  // Brand accent — electric lime
  accent: '#CCFF50',
  accentDark: '#90B832',
  accentSubtle: '#1E2A0A',

  // Semantic
  success: '#4ADE80',
  successSubtle: '#052912',
  warning: '#FBB040',
  warningSubtle: '#2A1D00',
  danger: '#F87171',
  dangerSubtle: '#2D0707',
  info: '#60A5FA',

  // Pure
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const typography = {
  // We load these in the root layout via expo-font.
  // Using Syne for headings (geometric, athletic) and Inter Tight for body.
  display: Platform.select({ ios: 'Syne-Bold', android: 'Syne-Bold', default: 'System' }),
  displaySemibold: Platform.select({ ios: 'Syne-SemiBold', android: 'Syne-SemiBold', default: 'System' }),
  body: Platform.select({ ios: 'InterTight-Regular', android: 'InterTight-Regular', default: 'System' }),
  bodyMedium: Platform.select({ ios: 'InterTight-Medium', android: 'InterTight-Medium', default: 'System' }),
  bodySemibold: Platform.select({ ios: 'InterTight-SemiBold', android: 'InterTight-SemiBold', default: 'System' }),
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),

  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 38,
    '4xl': 48,
  },

  lineHeight: {
    tight: 1.15,
    normal: 1.4,
    relaxed: 1.65,
  },
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
};

const theme = { palette, typography, spacing, radius, shadow };
export default theme;
