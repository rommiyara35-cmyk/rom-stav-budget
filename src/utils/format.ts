import { HEBREW_MONTHS } from '../types/budget';

/**
 * Formats a number as Israeli Shekel cleanly in RTL UI.
 * Keeps minus sign visually crisp before the number using LTR isolate.
 */
export function formatILS(amount: number, showSign = false): string {
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('he-IL');
  if (rounded < 0) {
    return `\u200E-${absFormatted}\u00A0₪`;
  }
  if (showSign && rounded > 0) {
    return `\u200E+${absFormatted}\u00A0₪`;
  }
  return `${absFormatted}\u00A0₪`;
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '0%';
  return `${Math.round(ratio * 100)}%`;
}

export function getMonthKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`;
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex0: number } {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr) || 2026;
  const monthIndex0 = Math.max(0, Math.min(11, (Number(mStr) || 11) - 1));
  return { year, monthIndex0 };
}

export function formatMonthLabel(monthKey: string): string {
  const { year, monthIndex0 } = parseMonthKey(monthKey);
  return `${HEBREW_MONTHS[monthIndex0]} ${year}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const { year, monthIndex0 } = parseMonthKey(monthKey);
  const date = new Date(year, monthIndex0 + delta, 1);
  return getMonthKey(date.getFullYear(), date.getMonth());
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}.${m}.${y.slice(-2)}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addMonthsToISO(isoDate: string, monthsToAdd: number): string {
  const [yStr, mStr, dStr] = isoDate.split('-');
  const year = Number(yStr) || 2026;
  const month0 = (Number(mStr) || 1) - 1;
  const day = Number(dStr) || 1;

  const targetMonthIndex = month0 + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth0 = ((targetMonthIndex % 12) + 12) % 12;
  const maxDayInTarget = new Date(targetYear, normalizedMonth0 + 1, 0).getDate();
  const clampedDay = Math.min(day, maxDayInTarget);

  return `${targetYear}-${String(normalizedMonth0 + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export function createId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
