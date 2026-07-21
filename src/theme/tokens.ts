/**
 * Design tokens ported 1:1 from the Claude Design prototype
 * ("Asepo Onboarding.dc.html"). Values here are the source of truth —
 * screens should never hardcode a hex.
 */

export type ThemeColors = {
  bg: string;
  surface: string;
  text: string;
  textSec: string;
  border: string;
  accent: string;
  accentTint: string;
  accentTint2: string;
  success: string;
  danger: string;
  chipBg: string;
  overlay: string;
  inputBg: string;
  /** Stand-in for photography until real images land. */
  photoA: string;
  photoB: string;
};

export const lightColors: ThemeColors = {
  bg: '#FDFBF7',
  surface: '#FFFFFF',
  text: '#1C1917',
  textSec: '#78716C',
  border: 'rgba(28,25,23,0.08)',
  accent: '#C2410C',
  accentTint: 'rgba(194,65,12,0.10)',
  accentTint2: 'rgba(194,65,12,0.18)',
  success: '#16A34A',
  danger: '#DC2626',
  chipBg: '#F5F1EA',
  overlay: 'rgba(28,25,23,0.45)',
  inputBg: '#F5F1EA',
  photoA: '#5a4230',
  photoB: '#443124',
};

export const darkColors: ThemeColors = {
  bg: '#131110',
  surface: '#1F1C1A',
  text: '#F5F1EC',
  textSec: '#A8A29E',
  border: 'rgba(255,255,255,0.08)',
  accent: '#E4622A',
  accentTint: 'rgba(228,98,42,0.16)',
  accentTint2: 'rgba(228,98,42,0.26)',
  success: '#22C55E',
  danger: '#F87171',
  chipBg: '#26221F',
  overlay: 'rgba(0,0,0,0.6)',
  inputBg: '#26221F',
  photoA: '#5a4230',
  photoB: '#443124',
};

/** Spacing scale — the prototype works on a loose 8pt grid with 16/20/24 gutters. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 20,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  sheet: 24,
  pill: 28,
} as const;

/** Primary CTA height used on every screen in the design. */
export const CTA_HEIGHT = 52;
