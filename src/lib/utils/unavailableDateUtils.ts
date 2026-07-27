// Client-side wrappers for /api/unavailable-dates.
// These throw on failure by design - no localStorage fallback, because a stale
// cache here would tell players a cancelled session is running.

export async function fetchUnavailableDates(): Promise<Record<string, string>> {
  const response = await fetch('/api/unavailable-dates', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Unable to load session dates. Please check your connection and try again.')
  }
  const data = await response.json()
  return data.unavailableDates ?? {}
}

async function write(
  method: 'POST' | 'DELETE',
  body: Record<string, unknown>,
): Promise<void> {
  const response = await fetch('/api/unavailable-dates', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Request failed. Please try again.')
  }
}

export async function markDateUnavailable(
  date: string,
  reason: string,
  password: string,
): Promise<void> {
  await write('POST', { date, reason, password })
}

export async function restoreDate(date: string, password: string): Promise<void> {
  await write('DELETE', { date, password })
}
