export function formatEventWhen(startISO: string, endISO: string | null | undefined) {
  const start = new Date(startISO);
  const datePart = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!endISO) return `${datePart} · ${startTime}`;
  const endTime = new Date(endISO).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${startTime}–${endTime}`;
}
