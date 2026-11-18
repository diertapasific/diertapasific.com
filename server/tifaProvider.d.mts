export const DEFAULT_MODEL: string
export const DEFAULT_FALLBACK_MODEL: string
export function requestTifaProvider(options: Record<string, unknown>): Promise<{ result?: unknown; model?: string; error?: string; status?: number; retryAfter?: number }>
