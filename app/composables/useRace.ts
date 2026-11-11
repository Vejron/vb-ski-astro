import { racePhase, raceFields, type Race, type RacePhase } from '#shared/race'

/**
 * Race data from content/umeloppet.yml plus the current phase.
 *
 * Pages are prerendered at build time, so `now` starts as the build time
 * (kept in the payload so hydration matches) and is replaced with the real
 * time in the browser. That way open/closed switches on the dates without
 * having to rebuild the site.
 */
export function useRace() {
  const race = useState<Race>('race')
  const now = useState('race-now', () => Date.now())

  if (import.meta.client) {
    onNuxtReady(() => {
      now.value = Date.now()
    })
  }

  const phase = computed<RacePhase>(() => racePhase(race.value, now.value))
  const isOpen = computed(() => phase.value === 'open')
  const fields = computed(() => raceFields(race.value))

  return { race, phase, isOpen, fields }
}
