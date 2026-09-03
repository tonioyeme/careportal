// Local formatting helpers for the portal shell and pages.
// Everything is rendered in the clinic's timezone so the demo reads the same
// on every machine. Today in the seed data is 2026-09-03.

import type { Specialty } from "../data/types";

const TZ = "America/New_York";

/** The "today" the seed data is written against. */
export const TODAY_ISO = "2026-09-03T12:00:00-04:00";

/**
 * A bare "2026-09-11" parses as UTC midnight, which is the previous evening in
 * the clinic timezone and would print the wrong day. Anchor bare dates at
 * midday so they survive the conversion in either direction.
 */
function normalize(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00-04:00` : iso;
}

function fmt(iso: string, options: Intl.DateTimeFormatOptions): string {
  const d = new Date(normalize(iso));
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...options }).format(d);
}

/** "Tuesday, September 8" */
export function formatDay(iso: string): string {
  return fmt(iso, { weekday: "long", month: "long", day: "numeric" });
}

/** "September 11, 2026" */
export function formatDate(iso: string): string {
  return fmt(iso, { month: "long", day: "numeric", year: "numeric" });
}

/** "10:30 AM" */
export function formatTime(iso: string): string {
  return fmt(iso, { hour: "numeric", minute: "2-digit" });
}

/** "Tuesday, September 8 at 10:30 AM" */
export function formatDayTime(iso: string): string {
  return `${formatDay(iso)} at ${formatTime(iso)}`;
}

/** "September 2 at 4:40 PM" — for message timestamps. */
export function formatStamp(iso: string): string {
  return `${fmt(iso, { month: "long", day: "numeric" })} at ${formatTime(iso)}`;
}

/** Calendar-day index in the clinic timezone, so comparisons ignore clock time. */
function dayIndex(iso: string): number {
  const d = new Date(normalize(iso));
  if (Number.isNaN(d.getTime())) return NaN;
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);
}

/** Whole calendar days from today. Negative means in the past. */
export function daysFromToday(iso: string): number {
  const a = dayIndex(iso);
  const b = dayIndex(TODAY_ISO);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return a - b;
}

/** "today" / "tomorrow" / "in 5 days" / "3 days ago" */
export function relativeDay(iso: string): string {
  const n = daysFromToday(iso);
  if (Number.isNaN(n)) return "";
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 1) return `in ${n} days`;
  return `${-n} days ago`;
}

/** "5 days left" — never "5d". */
export function daysLeftLabel(days: number): string {
  if (days <= 0) return "None left";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function specialtyLabel(s: Specialty): string {
  switch (s) {
    case "cardiology":
      return "Cardiology";
    case "endocrinology":
      return "Endocrinology";
    case "primary_care":
      return "Primary care";
    default:
      return s;
  }
}

/** "1 unread message" / "2 unread messages" */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * store.signDocument stores `${iso} by ${name}`. Split it back apart so the
 * to-do page can say who signed and when.
 */
export function parseSignature(raw: string | undefined): { at: string; by: string } | null {
  if (!raw) return null;
  const i = raw.indexOf(" by ");
  if (i === -1) return { at: raw, by: "" };
  return { at: raw.slice(0, i), by: raw.slice(i + 4) };
}
