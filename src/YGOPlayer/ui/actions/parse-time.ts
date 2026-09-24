/** "2m30s" / "5m" / "30s" / "90" (seconds) → seconds, or null when unreadable or zero. */
export function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    return seconds > 0 ? seconds : null;
  }

  const regex = /^(?:(\d+)m)?\s*(?:(\d+)s)?$/i;
  const match = trimmed.match(regex);

  if (!match) return null;

  const minutes = match[1] ? parseInt(match[1], 10) : 0;
  const seconds = match[2] ? parseInt(match[2], 10) : 0;

  if (minutes === 0 && seconds === 0) return null;

  return minutes * 60 + seconds;
}
