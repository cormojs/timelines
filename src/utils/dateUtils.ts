export type DatePrecision = 'year' | 'month' | 'day';
export type DateFormat = 'MDY' | 'DMY' | 'ISO';
type CalendarDate = {
  value: number;
  precision: DatePrecision;
  label: string | null;
  year: number;
  month: number;
  day: number;
};
type ParsedTimelineInput = Pick<CalendarDate, 'value' | 'precision' | 'label'>;
type DateKeyword = Pick<CalendarDate, 'value' | 'precision'>;
type DateParts = Pick<CalendarDate, 'year' | 'month' | 'day'>;

export const daysInMonth = (year: number, month: number): number => {
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return monthDays[month - 1] || 0;
};

const precisionFromValue = (value: number): DatePrecision | null => {
  if (!Number.isFinite(value)) return null;
  if (Number.isInteger(value)) return 'year';
  const scaled = value * 12;
  const isMonthGrid = Math.abs(scaled - Math.round(scaled)) < 1e-6;
  return isMonthGrid ? 'month' : 'day';
};

const dateToFractionalYear = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year + (month - 1) / 12 + (day - 1) / (daysInMonth(year, month) * 12);
};

// current date as a fractional year on the same day grid as parseTimelineInput
export const todayFractionalYear = () => dateToFractionalYear(new Date());

// Format is a display + input lens only; stored labels stay canonical ISO.
let activeDateFormat = 'MDY'; // "MDY" | "DMY" | "ISO"
export const setActiveDateFormat = (fmt: string): void => {
  activeDateFormat = fmt === 'DMY' || fmt === 'ISO' ? fmt : 'MDY';
};
export const getActiveDateFormat = (): DateFormat => activeDateFormat as DateFormat;

const pad2 = (n: number): string => String(n).padStart(2, '0');
const normalizeYear = (y: number): number => (Number.isFinite(y) && y >= 0 && y <= 99 ? y + 2000 : y);

// Canonical ISO stored label; year precision needs no label.
const canonicalDateLabel = (year: number, month: number, day: number, precision: DatePrecision): string | null => {
  if (precision === 'year') return null;
  if (precision === 'month') return `${year}-${pad2(month)}`;
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

export const formatCalendarDate = (
  year: number,
  month: number,
  day: number,
  precision: DatePrecision,
  fmt: DateFormat = activeDateFormat as DateFormat,
): string => {
  if (precision === 'year') return `${year}`;
  if (precision === 'month') return fmt === 'ISO' ? `${year}-${pad2(month)}` : `${pad2(month)}/${year}`;
  if (fmt === 'ISO') return `${year}-${pad2(month)}-${pad2(day)}`;
  if (fmt === 'DMY') return `${pad2(day)}/${pad2(month)}/${year}`;
  return `${pad2(month)}/${pad2(day)}/${year}`;
};

const buildCalendarDate = (year: number, month: number, day: number, precision: DatePrecision): CalendarDate | null => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12) return null;
  const maxDay = daysInMonth(year, month);
  if (day < 1 || day > maxDay) return null;
  return {
    value: year + (month - 1) / 12 + (day - 1) / (maxDay * 12),
    precision,
    label: canonicalDateLabel(year, month, day, precision),
    year,
    month,
    day,
  };
};

// ISO (dash) is auto-detected regardless of format; slash order follows the format.
const parseCalendarDate = (raw: string, fmt: DateFormat = activeDateFormat as DateFormat): CalendarDate | null => {
  const iso = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(raw);
  if (iso) {
    const hasDay = iso[3] !== undefined;
    return buildCalendarDate(Number(iso[1]), Number(iso[2]), hasDay ? Number(iso[3]) : 1, hasDay ? 'day' : 'month');
  }
  if (raw.includes('/')) {
    const parts = raw.split('/').map((p) => p.trim());
    if (parts.length === 2) {
      return buildCalendarDate(normalizeYear(Number(parts[1])), Number(parts[0]), 1, 'month');
    }
    if (parts.length === 3) {
      const [a, b, c] = parts.map(Number);
      return fmt === 'DMY'
        ? buildCalendarDate(normalizeYear(c), b, a, 'day')
        : buildCalendarDate(normalizeYear(c), a, b, 'day');
    }
  }
  return null;
};

const DATE_KEYWORD_RE = /^(current|current-month|current-year|today|now)$/i;

export const parseDateKeyword = (raw: unknown): DateKeyword | null => {
  if (typeof raw !== 'string' || !DATE_KEYWORD_RE.test(raw.trim())) return null;
  const kw = raw.trim().toLowerCase();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (kw === 'current-year') return { value: year, precision: 'year' };
  if (kw === 'current-month') return { value: year + (month - 1) / 12, precision: 'month' };
  return {
    value: year + (month - 1) / 12 + (day - 1) / (daysInMonth(year, month) * 12),
    precision: 'day',
  };
};

const DYNAMIC_LABEL_NAMES: Record<string, string> = {
  current: 'Today',
  today: 'Today',
  now: 'Today',
  'current-month': 'This month',
  'current-year': 'This year',
};

// Read-only display: keywords -> "This year (2026)", fixed dates -> active format.
export const displayDateLabel = (label: unknown): string | null => {
  if (typeof label !== 'string') return null;
  const kw = parseDateKeyword(label);
  if (kw !== null) {
    const { year, month, day } = fractionalYearToDate(kw.value);
    const resolved = formatCalendarDate(year, month, day, kw.precision);
    return `${DYNAMIC_LABEL_NAMES[label.trim().toLowerCase()] || 'Today'} (${resolved})`;
  }
  const cal = parseCalendarDate(label);
  if (cal) return formatCalendarDate(cal.year, cal.month, cal.day, cal.precision);
  return label;
};

// Editable-field form: keywords stay literal so they can be re-typed.
export const formatDateForInput = (label: unknown): string => {
  if (typeof label !== 'string' || !label.trim()) return '';
  if (parseDateKeyword(label) !== null) return label.trim().toLowerCase();
  const cal = parseCalendarDate(label);
  if (cal) return formatCalendarDate(cal.year, cal.month, cal.day, cal.precision);
  return label;
};

// Legacy slash labels were always MM/DD/YYYY; upgrade to ISO regardless of active format.
export function normalizeLegacyDateLabel(label: string): string;
export function normalizeLegacyDateLabel(label: unknown): unknown;
export function normalizeLegacyDateLabel(label: unknown): unknown {
  if (typeof label !== 'string' || !label.includes('/')) return label;
  const cal = parseCalendarDate(label, 'MDY');
  return cal ? cal.label : label;
}

export const parseTimelineInput = (value: unknown): ParsedTimelineInput => {
  if (value === null || value === undefined) {
    return { value: null, label: null, precision: null };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, label: null, precision: precisionFromValue(value) };
  }

  const raw = String(value).trim();
  if (!raw) return { value: null, label: null, precision: null };

  // dynamic keywords stay labels so they re-resolve to the current date on every load
  const keyword = parseDateKeyword(raw);
  if (keyword !== null) {
    return { value: keyword.value, label: raw.trim().toLowerCase(), precision: keyword.precision };
  }

  const cal = parseCalendarDate(raw);
  if (cal) {
    return { value: cal.value, label: cal.label, precision: cal.precision };
  }

  const num = Number(raw);
  return Number.isFinite(num)
    ? { value: num, label: null, precision: precisionFromValue(num) }
    : { value: null, label: null, precision: null };
};

export const snapToMonthGrid = (value: number): number => {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * 12) / 12;
};

export const fractionalYearToDate = (value: number): DateParts => {
  const yearInt = Math.floor(value);
  const fraction = Math.max(0, value - yearInt);
  const monthIndex = Math.min(11, Math.floor(fraction * 12 + 1e-9));
  const month = monthIndex + 1;
  const monthFraction = Math.max(0, fraction * 12 - monthIndex);
  const days = daysInMonth(yearInt, month);
  const day = Math.min(days, Math.max(1, Math.floor(monthFraction * days + 1e-9) + 1));
  return { year: yearInt, month, day };
};

export const snapToDayGrid = (value: number): number => {
  if (!Number.isFinite(value)) return value;
  const yearInt = Math.floor(value);
  const fraction = Math.max(0, value - yearInt);
  const monthIndex = Math.min(11, Math.floor(fraction * 12 + 1e-9));
  const month = monthIndex + 1;
  const monthFraction = Math.max(0, fraction * 12 - monthIndex);
  const days = daysInMonth(yearInt, month);
  const day = Math.min(days, Math.max(1, Math.round(monthFraction * days + 0.5 - 1e-9) + 1));
  return yearInt + (month - 1) / 12 + (day - 1) / (days * 12);
};
