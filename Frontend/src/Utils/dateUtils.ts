/**
 * INOP Centralized Date & Time Localization Utility
 *
 * Rules:
 * 1. Date-only values (YYYY-MM-DD) MUST NOT be parsed through UTC/local timestamp constructors
 *    to prevent day shifts across timezones.
 * 2. Timestamps MUST be formatted using the target timezone ('Asia/Baku' for Azerbaijan by default).
 * 3. Azerbaijani presentation:
 *    - Date-only: DD/MM/YYYY (e.g. 05/11/2026)
 *    - Timestamp: DD/MM/YYYY HH:mm (e.g. 05/11/2026 12:15)
 * 4. Russian presentation:
 *    - Date-only: DD.MM.YYYY (e.g. 05.11.2026)
 *    - Timestamp: DD.MM.YYYY HH:mm (e.g. 05.11.2026 12:15)
 * 5. English presentation:
 *    - Date-only: DD/MM/YYYY
 *    - Timestamp: DD/MM/YYYY HH:mm
 */

export const BAKU_TIMEZONE = 'Asia/Baku';

/** Matches date-only calendar strings like '2026-11-05' */
const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats a calendar date-only value (YYYY-MM-DD or Date object) without timezone conversion.
 */
export function formatDateOnly(
  value: string | Date | null | undefined,
  locale = 'az'
): string {
  if (!value) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = DATE_ONLY_REGEX.exec(trimmed);
    if (match) {
      const [, year, month, day] = match;
      if (locale === 'ru') {
        return `${day}.${month}.${year}`;
      }
      return `${day}/${month}/${year}`;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      const datePart = trimmed.slice(0, 10);
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        if (locale === 'ru') {
          return `${day}.${month}.${year}`;
        }
        return `${day}/${month}/${year}`;
      }
    }
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (locale === 'ru') {
    return `${day}.${month}.${year}`;
  }
  return `${day}/${month}/${year}`;
}

/**
 * Formats a timestamp into localized presentation with time.
 * Defaults to 'Asia/Baku' timezone for consistent Azerbaijan operational reporting.
 */
export function formatDateTime(
  value: string | Date | number | null | undefined,
  locale = 'az',
  options?: { timeZone?: string; includeSeconds?: boolean }
): string {
  if (!value) return '';

  const timeZone = options?.timeZone || BAKU_TIMEZONE;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '';

  try {
    const formatter = new Intl.DateTimeFormat(
      locale === 'az' ? 'az-AZ' : locale === 'ru' ? 'ru-RU' : 'en-GB',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: options?.includeSeconds ? '2-digit' : undefined,
        hour12: false,
        timeZone,
      }
    );

    const parts = formatter.formatToParts(d);
    let day = '';
    let month = '';
    let year = '';
    let hour = '';
    let minute = '';
    let second = '';

    for (const part of parts) {
      if (part.type === 'day') day = part.value;
      else if (part.type === 'month') month = part.value;
      else if (part.type === 'year') year = part.value;
      else if (part.type === 'hour') hour = part.value;
      else if (part.type === 'minute') minute = part.value;
      else if (part.type === 'second') second = part.value;
    }

    const timeStr = options?.includeSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;

    if (locale === 'ru') {
      return `${day}.${month}.${year} ${timeStr}`;
    }
    return `${day}/${month}/${year} ${timeStr}`;
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}`;
  }
}

/**
 * Smart date formatter:
 * Automatically detects whether value is a date-only string (e.g. '2026-11-05')
 * or a timestamp, and applies the appropriate format without day shifts.
 */
export function formatAppDate(
  value: string | Date | number | null | undefined,
  locale = 'az',
  options?: { includeTime?: boolean; timeZone?: string }
): string {
  if (!value) return '';

  if (typeof value === 'string' && DATE_ONLY_REGEX.test(value.trim()) && !options?.includeTime) {
    return formatDateOnly(value, locale);
  }

  if (options?.includeTime) {
    return formatDateTime(value, locale, options);
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '';

  try {
    const timeZone = options?.timeZone || BAKU_TIMEZONE;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const isoDateInZone = formatter.format(d);
    return formatDateOnly(isoDateInZone, locale);
  } catch {
    return formatDateOnly(d, locale);
  }
}
