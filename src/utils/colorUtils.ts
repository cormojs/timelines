import { TinyColor } from '@ctrl/tinycolor';

/** Normalizes a CSS color string to six-digit hexadecimal for color input controls. */
export const colorToHex = (color: string): string | null => {
  const parsed = new TinyColor(color);
  return parsed.isValid ? parsed.toHexString() : null;
};

/** Adds an alpha channel to a recognized CSS color, preserving invalid CSS strings as-is. */
export const withAlpha = (color: string, alpha: number): string => {
  const parsed = new TinyColor(color);
  return parsed.isValid ? parsed.setAlpha(alpha).toRgbString() : color;
};

/** Blends two recognized CSS colors by the first color's weight, with safe fallbacks for invalid input. */
export const blendColors = (color1: string, color2: string, weight1 = 0.5): string => {
  const first = new TinyColor(color1);
  const second = new TinyColor(color2);
  if (!first.isValid || !second.isValid) {
    return color1;
  }
  const clampedWeight = Math.min(1, Math.max(0, weight1));
  return first.mix(second, (1 - clampedWeight) * 100).toHexString();
};

/** Returns a six-digit hexadecimal color, removing harmless formatting characters or using gray as fallback. */
export const normalizeColor = (color: string): string => {
  if (!color) return '#808080';
  const cleaned = color.replace(/[^0-9A-Fa-f#]/g, '');
  const parsed = new TinyColor(cleaned);
  return parsed.isValid && parsed.toHexString() === cleaned.toLowerCase() ? cleaned : '#808080';
};
