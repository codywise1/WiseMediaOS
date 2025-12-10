export function formatAppDate(input: string | number | Date | null | undefined): string {
  if (!input) return '';

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const month = date.toLocaleString('en-US', { month: 'short' }); // e.g. "Dec"
  const day = date.getDate();
  const year = date.getFullYear();

  // Format: "Dec. 10. 2025"
  return `${month}. ${day}. ${year}`;
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
