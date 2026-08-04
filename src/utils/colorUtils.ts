type Rgb = readonly [number, number, number];

const parseHexRGB = (hex: unknown): Rgb | null => {
  if (typeof hex !== 'string') return null;
  const v = hex.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(v);
  if (short) {
    const [r, g, b] = short[1].split('').map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  const full = /^#([0-9a-f]{6})$/i.exec(v);
  if (full) {
    return [parseInt(full[1].slice(0, 2), 16), parseInt(full[1].slice(2, 4), 16), parseInt(full[1].slice(4, 6), 16)];
  }
  return null;
};

export const withAlpha = (hex: unknown, alpha: number): string => {
  const rgb = parseHexRGB(hex);
  if (rgb) return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  return typeof hex === 'string' ? hex : `rgba(0, 0, 0, ${alpha})`;
};

export const blendColors = (hex1: unknown, hex2: unknown, weight1 = 0.5): string => {
  const c1 = parseHexRGB(hex1);
  const c2 = parseHexRGB(hex2);
  if (!c1 || !c2) {
    if (typeof hex1 === 'string') return hex1;
    if (typeof hex2 === 'string') return hex2;
    return '#888888';
  }
  const w = Math.min(1, Math.max(0, weight1));
  const r = Math.round(c1[0] * w + c2[0] * (1 - w));
  const g = Math.round(c1[1] * w + c2[1] * (1 - w));
  const b = Math.round(c1[2] * w + c2[2] * (1 - w));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

const isValidHexColor = (color: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(color);

export const normalizeColor = (color: unknown): string => {
  if (typeof color !== 'string' || !color) return '#808080';
  if (isValidHexColor(color)) return color;
  const cleaned = color.replace(/[^0-9A-Fa-f#]/g, '');
  if (isValidHexColor(cleaned)) return cleaned;
  return '#808080';
};
