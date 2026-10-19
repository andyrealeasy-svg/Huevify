/**
 * Utility functions for release date formatting and parsing.
 * 
 * Ensures consistent release date presentation across all timezones.
 * When an artist sets a release date (e.g. "2026-02-15 00:00:00" in UTC or Moscow time),
 * users in any timezone (whether UTC-8, UTC+0, or UTC+5) will see the exact intended release date
 * ("15 февраля 2026 г.") rather than rolling over to "14 февраля" due to local timezone offsets.
 */

const MONTH_NAMES_RU: Record<number, string> = {
  1: 'января',
  2: 'февраля',
  3: 'марта',
  4: 'апреля',
  5: 'мая',
  6: 'июня',
  7: 'июля',
  8: 'августа',
  9: 'сентября',
  10: 'октября',
  11: 'ноября',
  12: 'декабря'
};

const MONTH_NAMES_EN: Record<number, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December'
};

export interface ExtractedDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Extracts the calendar year, month, and day as originally specified by the artist/creator,
 * completely immune to client timezone shifts.
 */
export function extractReleaseDateParts(dateString?: string): ExtractedDateParts | null {
  if (!dateString) return null;
  const str = String(dateString).trim();
  if (!str) return null;

  // Legacy releases store the selected UTC+3 date/time as a UTC timestamp.
  // Recover the intended calendar date for those values.
  const isUtcMidnightAnchor = /T00:00:00(?:\.000)?(?:Z|\+00:00)$/i.test(str);
  if (!isUtcMidnightAnchor && /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const utcPlusThree = new Date(parsed.getTime() + 3 * 60 * 60 * 1000);
      return {
        year: utcPlusThree.getUTCFullYear(),
        month: utcPlusThree.getUTCMonth() + 1,
        day: utcPlusThree.getUTCDate()
      };
    }
  }

  // 1. Matches standard YYYY-MM-DD (e.g. "2026-02-15", "2026-02-15T...", "2026-02-15 00:00:00")
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }

  // 2. Matches DD.MM.YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }

  // 3. Fallback to UTC components of parsed Date object
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1,
        day: parsed.getUTCDate()
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export function getReleaseTimestamp(dateString?: string, time = '00:00'): number {
  if (!dateString) return NaN;
  const str = String(dateString).trim();
  if (!str) return NaN;

  // Existing releases store the complete release instant in an ISO timestamp.
  if (!/T00:00:00(?:\.000)?(?:Z|\+00:00)$/i.test(str) && /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
    return new Date(str).getTime();
  }

  const parts = extractReleaseDateParts(str);
  if (!parts) return NaN;
  const date = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
  return new Date(`${date}T${normalizedTime}:00+03:00`).getTime();
}

/**
 * Formats a release date consistently across all client timezones.
 * Example outputs:
 * - "15 февраля 2026 г." (Russian)
 * - "February 15, 2026" (English)
 */
export function formatReleaseDateDisplay(dateString?: string, isEnglish?: boolean): string {
  if (!dateString) return '';
  const parts = extractReleaseDateParts(dateString);
  if (!parts) return dateString;

  const { year, month, day } = parts;

  if (isEnglish) {
    const monthName = MONTH_NAMES_EN[month] || String(month);
    return `${monthName} ${day}, ${year}`;
  }

  const monthName = MONTH_NAMES_RU[month] || String(month);
  return `${day} ${monthName} ${year} г.`;
}

/**
 * Formats release date as DD/MM/YYYY consistently across timezones.
 */
export function formatNumericReleaseDate(dateString?: string): string {
  if (!dateString) return '';
  const parts = extractReleaseDateParts(dateString);
  if (!parts) return dateString;

  const dayStr = String(parts.day).padStart(2, '0');
  const monthStr = String(parts.month).padStart(2, '0');
  return `${dayStr}/${monthStr}/${parts.year}`;
}
