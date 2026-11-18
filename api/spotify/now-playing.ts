import { createSpotifyHandler } from '../../server/vercelBackend.mjs'

const handler = createSpotifyHandler(process.env)
export default { fetch: handler }
