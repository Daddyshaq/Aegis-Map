import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

function toDate(value: string | number | Date): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = typeof value === 'number' ? new Date(value) : parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** e.g. "3 hours ago", "in 2 days". Falls back to em dash on bad input. */
export function formatRelativeTime(value: string | number | Date | null | undefined): string {
  if (value == null) return '—';
  const date = toDate(value);
  if (!date) return '—';
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/** e.g. "24 Aug 2026, 14:32". */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null) return '—';
  const date = toDate(value);
  if (!date) return '—';
  return format(date, 'd MMM yyyy, HH:mm');
}

/** e.g. "24 Aug 2026". */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value == null) return '—';
  const date = toDate(value);
  if (!date) return '—';
  return format(date, 'd MMM yyyy');
}

/** Human distance: metres under 1 km, otherwise kilometres to one decimal. */
export function formatDistanceMeters(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

/** Human duration from seconds: "45 s", "12 min", "1 h 5 min". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

const numberFormatter = new Intl.NumberFormat('en-US');

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '0';
  return numberFormatter.format(value);
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/** e.g. "9.0765, 7.3986". */
export function formatCoordinate(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
