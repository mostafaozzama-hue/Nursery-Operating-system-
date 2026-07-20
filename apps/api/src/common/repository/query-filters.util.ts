export function containsInsensitive(value: string | undefined) {
  return value ? { contains: value, mode: 'insensitive' as const } : undefined;
}
