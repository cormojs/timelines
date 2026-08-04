type Rgb = readonly [number, number, number];

const HEX_RGB_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

const parseHexRGB = (hex: unknown): Rgb | null => {
  if (typeof hex !== 'string') return null;
  const match = HEX_RGB_RE.exec(hex.trim());
  if (!match) return null;
  const channels = match[1].length === 3 ? match[1].replace(/./g, '$&$&') : match[1];
  return [
    Number.parseInt(channels.slice(0, 2), 16),
    Number.parseInt(channels.slice(2, 4), 16),
    Number.parseInt(channels.slice(4, 6), 16),
  ];
};

const toHex = (channel: number): string => channel.toString(16).padStart(2, '0');

export const colorToHex = (color: unknown): string | null => {
  const hex = parseHexRGB(color);
  if (hex) return `#${hex.map(toHex).join('')}`;

  if (typeof color !== 'string') return null;
  const match = /^rgba?\(([^)]+)\)$/i.exec(color.trim());
  if (!match) return null;
  const channels = match[1]
    .split(',')
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()));
  if (channels.length !== 3 || channels.some(Number.isNaN)) return null;
  return `#${channels.map((channel) => toHex(Math.min(255, Math.max(0, Math.round(channel))))).join('')}`;
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
  return `#${[r, g, b].map(toHex).join('')}`;
};

export const normalizeColor = (color: unknown): string => {
  if (typeof color !== 'string' || !color) return '#808080';
  if (HEX_COLOR_RE.test(color)) return color;
  const cleaned = color.replace(/[^0-9A-Fa-f#]/g, '');
  if (HEX_COLOR_RE.test(cleaned)) return cleaned;
  return '#808080';
};
