import type { Race } from '#shared/race'

// Load content/umeloppet.yml once. During prerender the data is put in the
// page payload, so the browser never has to query the content database for it.
export default defineNuxtPlugin(async () => {
  const race = useState<Race | null>('race', () => null)
  if (!race.value) {
    race.value = (await queryCollection('race').first()) as unknown as Race
  }
})
