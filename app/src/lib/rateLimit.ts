/**
 * Rate limiter en memoria con ventana deslizante.
 * Funciona para instancias únicas (Vercel Serverless — cada función tiene
 * su propio proceso, así que esto limita por instancia de función).
 * Para multi-instancia real, usar Redis (Upstash).
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Limpiar entradas vencidas cada 5 minutos para no acumular memoria
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

interface RateLimitOptions {
  /** Número máximo de requests permitidos en la ventana */
  limit: number
  /** Duración de la ventana en milisegundos */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // Primera request o ventana vencida — reset
    const newEntry: Entry = { count: 1, resetAt: now + options.windowMs }
    store.set(key, newEntry)
    return { success: true, remaining: options.limit - 1, resetAt: newEntry.resetAt }
  }

  if (entry.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: options.limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Obtiene la IP del cliente desde los headers de Next.js / Vercel.
 */
export function getClientIp(req: Request): string {
  const headers = new Headers(req.headers)
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  )
}
