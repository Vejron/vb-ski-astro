import { parse } from 'yaml'
import type { Race } from '#shared/race'

/**
 * Read content/umeloppet.yml (bundled as a server asset, see nuxt.config.ts).
 * Read directly instead of through Nuxt Content, so the API doesn't need a database.
 */
export async function getRace(): Promise<Race> {
  const raw = await useStorage('assets:race').getItem<string>('umeloppet.yml')
  if (!raw) throw createError({ statusCode: 500, statusMessage: 'umeloppet.yml saknas' })
  return parse(String(raw)) as Race
}
