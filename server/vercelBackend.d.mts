type Environment = Record<string, string | undefined>
export function createTifaHandler(env: Environment, notes: unknown[], articles: unknown[], options?: unknown): (request: Request) => Promise<Response>
export function createSpotifyHandler(env: Environment, options?: unknown): (request: Request) => Promise<Response>
