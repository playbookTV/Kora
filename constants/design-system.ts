import { Colors, Typography, Spacings, ThemeManager } from 'react-native-ui-lib';
import { Appearance } from 'react-native';

/**
 * Kora Design System
 * Based on "Minimal UI, maximum voice" philosophy.
 *
 * This file initializes the react-native-ui-lib design tokens
 * with full TypeScript support and dark mode capabilities.
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ColorName = keyof typeof colorPalette;
export type TypographyName = keyof typeof typographyPresets;
export type SpacingName = keyof typeof spacingScale;

// =============================================================================
// COLOR PALETTE
// =============================================================================

const colorPalette = {
  // Brand Colors
  primary: '#1E1E1E',
  primaryLight: '#3D3D3D',
  secondary: '#5A5A5A',

  // Backgrounds
  screenBG: '#FFFFFF',
  cardBG: '#F8F8F8',
  surfaceBG: '#FAFAFA',

  // Status Colors
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FFC107',
  warningLight: '#FFF8E1',
  error: '#F44336',
  errorLight: '#FFEBEE',

  // Text Colors
  textDefault: '#1E1E1E',
  textMuted: '#9E9E9E',
  textDisabled: '#BDBDBD',
  textInverse: '#FFFFFF',

  // Border & Divider
  border: '#E0E0E0',
  divider: '#EEEEEE',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Transparent
  transparent: 'transparent',
} as const;

const darkColorPalette = {
  // Brand Colors
  primary: '#FFFFFF',
  primaryLight: '#E0E0E0',
  secondary: '#BDBDBD',

  // Backgrounds
  screenBG: '#121212',
  cardBG: '#1E1E1E',
  surfaceBG: '#2C2C2C',

  // Status Colors
  success: '#66BB6A',
  successLight: '#1B3D1E',
  warning: '#FFCA28',
  warningLight: '#3D3520',
  error: '#EF5350',
  errorLight: '#3D1B1B',

  // Text Colors
  textDefault: '#FFFFFF',
  textMuted: '#9E9E9E',
  textDisabled: '#616161',
  textInverse: '#1E1E1E',

  // Border & Divider
  border: '#424242',
  divider: '#2C2C2C',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Transparent
  transparent: 'transparent',
} as const;

// =============================================================================
// TYPOGRAPHY PRESETS
// =============================================================================

const typographyPresets = {
  // Display - For hero numbers like Safe Spend
  h1: { fontSize: 48, fontWeight: '700' as const, lineHeight: 56 },

  // Headings
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },

  // Body Text
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },

  // Small Text
  small: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  smallBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },

  // Caption / Metadata
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  captionBold: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },

  // Button Text
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  buttonSmall: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
} as const;

// =============================================================================
// SPACING SCALE
// =============================================================================

const spacingScale = {
  // Named Spacings
  page: 20,
  card: 16,
  section: 24,

  // Numeric Scale (4px base)
  s0: 0,
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 28,
  s8: 32,
  s10: 40,
  s12: 48,
  s16: 64,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const BorderRadius = {
  none: 0,
  small: 4,
  medium: 8,
  large: 12,
  xl: 16,
  xxl: 20,
  round: 9999,
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const Shadows = {
  none: {},
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// =============================================================================
// ANIMATION DURATIONS
// =============================================================================

export const Durations = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the design system with light mode colors
 */
function initializeLightMode() {
  Colors.loadColors(colorPalette);
}

/**
 * Initialize the design system with dark mode colors
 */
function initializeDarkMode() {
  Colors.loadColors(darkColorPalette);
}

/**
 * Initialize color schemes for automatic theme switching
 */
function initializeColorSchemes() {
  Colors.loadSchemes({
    light: colorPalette,
    dark: darkColorPalette,
  });
}

/**
 * Initialize typography presets
 */
function initializeTypography() {
  Typography.loadTypographies(typographyPresets);
}

/**
 * Initialize spacing scale
 */
function initializeSpacings() {
  Spacings.loadSpacings(spacingScale);
}

/**
 * Configure theme manager for automatic dark mode switching
 */
function configureThemeManager() {
  ThemeManager.setComponentTheme('Text', {
    textDefault: true,
  });

  ThemeManager.setComponentTheme('View', {
    // Default view settings can be added here
  });
}

/**
 * Initialize the complete design system
 * @param options Configuration options
 */
export function initializeDesignSystem(options?: {
  /** Enable automatic dark mode switching based on system preference */
  autoDarkMode?: boolean;
  /** Force a specific color scheme */
  forceScheme?: 'light' | 'dark';
}) {
  const { autoDarkMode = false, forceScheme } = options ?? {};

  // Initialize typography and spacings (same for both modes)
  initializeTypography();
  initializeSpacings();

  if (forceScheme) {
    // Force a specific scheme
    if (forceScheme === 'dark') {
      initializeDarkMode();
    } else {
      initializeLightMode();
    }
  } else if (autoDarkMode) {
    // Enable automatic scheme switching
    initializeColorSchemes();
    const colorScheme = Appearance.getColorScheme();
    if (colorScheme === 'dark') {
      initializeDarkMode();
    } else {
      initializeLightMode();
    }
  } else {
    // Default to light mode
    initializeLightMode();
  }

  configureThemeManager();
}

// =============================================================================
// HELPER UTILITIES
// =============================================================================

/**
 * Get a color value by name (respects current theme)
 */
export function getColor(name: ColorName): string {
  return Colors[name] as string;
}

/**
 * Get a spacing value by name
 */
export function getSpacing(name: SpacingName): number {
  return spacingScale[name];
}

/**
 * Create a color with opacity
 */
export function withOpacity(color: string, opacity: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

/**
 * Get status color based on value thresholds
 */
export function getStatusColor(
  value: number,
  thresholds: { warning: number; danger: number }
): string {
  if (value <= thresholds.danger) {
    return Colors.error as string;
  }
  if (value <= thresholds.warning) {
    return Colors.warning as string;
  }
  return Colors.success as string;
}

/**
 * Get Safe Spend status color
 * - Green: > 30% of daily budget remaining
 * - Yellow: 10-30% remaining
 * - Red: < 10% remaining
 */
export function getSafeSpendColor(current: number, daily: number): string {
  if (daily <= 0) return Colors.textMuted as string;
  const percentage = (current / daily) * 100;
  return getStatusColor(percentage, { warning: 30, danger: 10 });
}

// =============================================================================
// EXPORTED CONSTANTS
// =============================================================================

export { colorPalette, darkColorPalette, typographyPresets, spacingScale };

// =============================================================================
// AUTO-INITIALIZE (Default: Light mode, no auto dark mode)
// =============================================================================

initializeDesignSystem({ autoDarkMode: false });
