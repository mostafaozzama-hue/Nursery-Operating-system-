/**
 * Minimal parser for the 'Nm' / 'Nh' / 'Nd' TTL strings used by this
 * project's env vars (e.g. JWT_REFRESH_TOKEN_TTL=30d). Not a general
 * duration parser - only the units actually in use.
 */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)(m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration "${value}" - expected format like "15m", "1h", "30d"`);
  }

  const amount = Number(match[1]);
  const unitMs = { m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 'm' | 'h' | 'd'];

  return amount * unitMs;
}
