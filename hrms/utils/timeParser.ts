/** @format */

/**
 * Parses a free-text time string into minutes-since-midnight.
 * Handles both formats used across the app:
 *  - WorkingDay.officeTiming free text, e.g. "09:30 AM", "9:30am", "06:30 PM"
 *  - <input type="time"> 24h strings, e.g. "09:30", "18:30"
 * Returns null if the string can't be parsed.
 */
export function parseTimeStringToMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const str = raw.trim();

  // 24h "HH:MM" (no am/pm suffix)
  const plain24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (plain24) {
    const hours = Number(plain24[1]);
    const minutes = Number(plain24[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  // "9:30 AM" / "09:30am" / "9:30 A.M." style
  const withMeridiem = str.match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?$/);
  if (withMeridiem) {
    let hours = Number(withMeridiem[1]);
    const minutes = Number(withMeridiem[2]);
    const meridiem = withMeridiem[3].toLowerCase();
    if (hours > 12 || minutes > 59) return null;
    if (hours === 12) hours = 0;
    if (meridiem === "p") hours += 12;
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Parses a break-window range string, e.g. "01:00 PM - 02:00 PM", into a
 * duration in minutes. Display-only helper (does not affect worked-hours
 * math, which already derives break duration from actual totalBreakSeconds).
 */
export function parseBreakWindowDurationMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const parts = raw.split("-").map((p) => p.trim());
  if (parts.length !== 2) return null;

  const start = parseTimeStringToMinutes(parts[0]);
  const end = parseTimeStringToMinutes(parts[1]);
  if (start === null || end === null) return null;

  const diff = end - start;
  return diff >= 0 ? diff : null;
}
