import { isValid, parse } from 'date-fns';
import { Temporal } from '@js-temporal/polyfill';

export type DatePrecision = 'year' | 'month' | 'day';
export type DateFormat = 'MDY' | 'DMY' | 'YMD' | 'ISO';
export type TimelineDateInput = string | number | null | undefined;
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
  try {
    return Temporal.PlainYearMonth.from({ year, month }).daysInMonth;
  } catch {
    return 0;
  }
};

const precisionFromValue = (value: number): DatePrecision | null => {
  if (!Number.isFinite(value)) return null;
  if (Number.isInteger(value)) return 'year';
  const scaled = value * 12;
  const isMonthGrid = Math.abs(scaled - Math.round(scaled)) < 1e-6;
  return isMonthGrid ? 'month' : 'day';
};

const dateToFractionalYear = (date: Temporal.PlainDate): number => {
  const { year, month, day } = date;
  return year + (month - 1) / 12 + (day - 1) / (daysInMonth(year, month) * 12);
};

// current date as a fractional year on the same day grid as parseTimelineInput
export const todayFractionalYear = () => dateToFractionalYear(Temporal.Now.plainDateISO());

// Format is a display + input lens only; stored labels stay canonical ISO.
let activeDateFormat: DateFormat = 'MDY';
export const setActiveDateFormat = (fmt: string): void => {
  activeDateFormat = fmt === 'DMY' || fmt === 'YMD' || fmt === 'ISO' ? fmt : 'MDY';
};
export const getActiveDateFormat = (): DateFormat => activeDateFormat;

const normalizeYear = (y: number): number => (Number.isFinite(y) && y >= 0 && y <= 99 ? y + 2000 : y);
const PARSE_REFERENCE_DATE = new Date(0);

export const formatCalendarDate = (
  year: number,
  month: number,
  day: number,
  precision: DatePrecision,
  fmt: DateFormat = activeDateFormat,
): string => {
  const date = Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' });
  if (precision === 'year') return String(date.year);
  if (fmt === 'YMD') {
    const monthPart = String(date.month).padStart(2, '0');
    return precision === 'day' ? `${date.year}/${monthPart}/${String(date.day).padStart(2, '0')}` : `${date.year}/${monthPart}`;
  }

  const locale = fmt === 'DMY' ? 'en-GB' : fmt === 'ISO' ? 'en-CA' : 'en-US';
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    calendar: 'iso8601',
    numberingSystem: 'latn',
  };
  if (precision === 'day') options.day = '2-digit';
  return date.toLocaleString(locale, options);
};

const buildCalendarDate = (date: Temporal.PlainDate, precision: DatePrecision): CalendarDate => ({
  value: dateToFractionalYear(date),
  precision,
  label: precision === 'year' ? null : formatCalendarDate(date.year, date.month, date.day, precision, 'ISO'),
  year: date.year,
  month: date.month,
  day: date.day,
});

const parsePlainDate = (value: string): CalendarDate | null => {
  try {
    return buildCalendarDate(Temporal.PlainDate.from(value), 'day');
  } catch {
    try {
      const month = Temporal.PlainYearMonth.from(value);
      return buildCalendarDate(month.toPlainDate({ day: 1 }), 'month');
    } catch {
      return null;
    }
  }
};

const parseFormattedDate = (value: string, format: string, precision: DatePrecision): CalendarDate | null => {
  const parsed = parse(value, format, PARSE_REFERENCE_DATE);
  if (!isValid(parsed)) return null;

  try {
    return buildCalendarDate(
      Temporal.PlainDate.from({
        year: normalizeYear(parsed.getFullYear()),
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
      }),
      precision,
    );
  } catch {
    return null;
  }
};

// ISO (dash) is auto-detected regardless of format; slash order follows the format.
const parseCalendarDate = (raw: string, fmt: DateFormat = activeDateFormat): CalendarDate | null => {
  const direct = parsePlainDate(raw);
  if (direct) return direct;
  const iso = parseFormattedDate(raw, 'yyyy-M-d', 'day') ?? parseFormattedDate(raw, 'yyyy-M', 'month');
  if (iso) return iso;

  const dayFormat = fmt === 'DMY' ? 'd/M/yyyy' : fmt === 'YMD' ? 'yyyy/M/d' : 'M/d/yyyy';
  const monthFormat = fmt === 'YMD' ? 'yyyy/M' : 'M/yyyy';
  return parseFormattedDate(raw, dayFormat, 'day') ?? parseFormattedDate(raw, monthFormat, 'month');
};

const DATE_KEYWORD_RE = /^(current|current-month|current-year|today|now)$/i;

export const parseDateKeyword = (raw: string): DateKeyword | null => {
  if (!DATE_KEYWORD_RE.test(raw.trim())) return null;
  const kw = raw.trim().toLowerCase();
  const now = Temporal.Now.plainDateISO();
  const { year, month, day } = now;
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
export const displayDateLabel = (label: string | null | undefined): string | null => {
  if (label === null || label === undefined) return null;
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
export const formatDateForInput = (label: string | null | undefined): string => {
  if (!label?.trim()) return '';
  if (parseDateKeyword(label) !== null) return label.trim().toLowerCase();
  const cal = parseCalendarDate(label);
  if (cal) return formatCalendarDate(cal.year, cal.month, cal.day, cal.precision);
  return label;
};

// Legacy slash labels were always MM/DD/YYYY; upgrade to ISO regardless of active format.
export const normalizeLegacyDateLabel = (label: string): string => {
  if (!label.includes('/')) return label;
  const cal = parseCalendarDate(label, 'MDY');
  return cal ? cal.label : label;
};

export const parseTimelineInput = (value: TimelineDateInput): ParsedTimelineInput => {
  if (value === null || value === undefined) {
    return { value: null, label: null, precision: null };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, label: null, precision: precisionFromValue(value) };
  }

  const raw = typeof value === 'string' ? value.trim() : '';
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
