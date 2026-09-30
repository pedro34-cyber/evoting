export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export function errorMessage(detail: unknown, fallback = 'Unable to complete this request. Please try again.'): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(item => item?.msg || 'Invalid input').join('. ')
  return fallback
}
export function networkMessage(error: unknown): string {
  return error instanceof TypeError ? 'Unable to connect to the server.' : error instanceof Error ? error.message : 'Unable to complete this request.'
}
export async function responseData(res: Response) {
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(res.status >= 500 ? 'The server is unavailable. Please try again shortly.' : errorMessage(data?.detail, `Unable to complete this request (${res.status}).`))
  return data
}
export const imageUrl = (path?: string) => path ? (/^https?:\/\//.test(path) ? path : apiBase + path) : ''
