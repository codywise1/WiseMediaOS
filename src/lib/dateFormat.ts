export function formatAppDate(input: string | number | Date | null | undefined): string {
  if (!input) return '';

  let date: Date;
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // Date-only strings (YYYY-MM-DD) are parsed as UTC by JS. Split into
    // local parts so the displayed day matches what's stored regardless of tz.
    const [, y, m, d] = input.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
    date = new Date(Number(y), Number(m) - 1, Number(d));
  } else {
    date = new Date(input);
  }
  if (Number.isNaN(date.getTime())) return '';

  const month = date.toLocaleString('en-US', { month: 'short' }); // e.g. "Dec"
  const day = date.getDate();
  const year = date.getFullYear();

  // Format: "Dec. 10, 2025"
  return `${month}. ${day}, ${year}`;
}

export function formatToISODate(input: Date | string | null | undefined): string {
  if (!input) return '';

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function parseAppDate(input: string): Date | null {
  if (!input || typeof input !== 'string') return null;

  // Match format like "Dec. 10, 2025"
  const match = input.trim().match(/^([A-Za-z]+)\.\s*(\d{1,2}),\s*(\d{4})$/);
  if (!match) return null;

  const [, monthStr, dayStr, yearStr] = match;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
  if (monthIndex === -1) return null;

  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);

  const date = new Date(year, monthIndex, day);
  return isNaN(date.getTime()) ? null : date;
}

export function formatAppDateTime(input: string | number | Date | null | undefined): string {
  if (!input) return '';

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const datePart = formatAppDate(date);
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${datePart} · ${timePart}`;
}
