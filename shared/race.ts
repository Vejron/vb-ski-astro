// Shared race logic used by both the website (app/) and the API (server/).
// All race data lives in content/umeloppet.yml – see README.

export type RegistrationStatus = 'auto' | 'open' | 'closed' | 'full' | 'cancelled'

/**
 * The phase the race is currently in.
 * - upcoming:  registration not opened yet
 * - open:      registration open
 * - closed:    registration closed (deadline passed or closed manually)
 * - full:      registration closed because max participants reached
 * - cancelled: race cancelled
 * - finished:  race day has passed
 */
export type RacePhase = 'upcoming' | 'open' | 'closed' | 'full' | 'cancelled' | 'finished'

export const RACE_PHASES: RacePhase[] = ['upcoming', 'open', 'closed', 'full', 'cancelled', 'finished']

export interface RaceDistance {
  id: string
  name: string
  price: number
  laps?: number
  seeding?: string
  classes: string[]
}

export interface RaceSponsor {
  name: string
  logo: string
  url?: string
}

export interface Race {
  year: number
  edition: number
  date: string
  startTime: string
  location: string
  registration: {
    status: RegistrationStatus
    opens: string
    closes: string
    maxParticipants?: number
  }
  payByDate: string
  payment: { swish: string, plusgiro: string }
  distances: RaceDistance[]
  documents?: { results?: string | null, startlist?: string | null, pm?: string | null, inbjudan?: string | null }
  receiverEmail: string
  sponsors?: RaceSponsor[]
}

const TZ = 'Europe/Stockholm'

/**
 * Parse "2027-01-28" or "2027-01-28T23:59" as Swedish local time
 * (the server runs in UTC, so we can't rely on the machine time zone).
 * A date without a time means the start of that day.
 */
export function swedishTime(value: string | Date): number {
  if (value instanceof Date) return value.getTime()
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(value).trim())
  if (!m) return new Date(value).getTime()
  const [, y, mo, d, h = '00', mi = '00'] = m
  const asUtc = Date.UTC(+y!, +mo! - 1, +d!, +h, +mi)
  // Find Stockholm's UTC offset at that moment and correct for it
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(new Date(asUtc))
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const tzAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return asUtc - (tzAsUtc - asUtc)
}

/** End of the race day (23:59 Swedish time). */
function raceDayEnd(race: Race) {
  return swedishTime(String(race.date).slice(0, 10) + 'T23:59')
}

export function racePhase(race: Race, now: number = Date.now()): RacePhase {
  const status = race.registration.status
  if (status === 'cancelled') return 'cancelled'
  if (now > raceDayEnd(race)) return 'finished'
  if (status === 'open' || status === 'closed' || status === 'full') return status
  // auto
  if (now < swedishTime(race.registration.opens)) return 'upcoming'
  if (now <= swedishTime(race.registration.closes)) return 'open'
  return 'closed'
}

/** 1 → "1:a", 2 → "2:a", 16 → "16:e" (Swedish ordinal) */
export function ordinal(n: number) {
  const lastTwo = n % 100
  const last = n % 10
  return `${n}:${(last === 1 || last === 2) && lastTwo !== 11 && lastTwo !== 12 ? 'a' : 'e'}`
}

/**
 * Swedish date text, e.g. "söndag den 1:a februari 2026".
 * opts.weekday – include the weekday, opts.year – include the year
 */
export function swedishDate(value: string | Date, opts: { weekday?: boolean, year?: boolean, time?: boolean } = {}) {
  const ts = swedishTime(value)
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, ...o }).format(ts)
  const day = Number(fmt({ day: 'numeric' }))
  let text = `${ordinal(day)} ${fmt({ month: 'long' })}`
  if (opts.weekday) text = `${fmt({ weekday: 'long' })} den ${text}`
  if (opts.year !== false) text += ` ${fmt({ year: 'numeric' })}`
  if (opts.time) text += ` kl ${fmt({ hour: '2-digit', minute: '2-digit' })}`
  return text
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Text values that can be inserted in markdown with :race{field="..."}
 */
export function raceFields(race: Race): Record<string, string> {
  const fields: Record<string, string> = {
    year: String(race.year),
    edition: ordinal(race.edition),
    date: swedishDate(race.date, { weekday: true }),
    dateShort: swedishDate(race.date, { year: false }),
    weekday: swedishDate(race.date, { weekday: true }).split(' ')[0]!,
    startTime: race.startTime,
    location: race.location,
    opens: swedishDate(race.registration.opens),
    closes: swedishDate(race.registration.closes, { time: true }),
    closesDate: swedishDate(race.registration.closes),
    payBy: swedishDate(race.payByDate),
    maxParticipants: String(race.registration.maxParticipants ?? ''),
    swish: race.payment.swish,
    plusgiro: race.payment.plusgiro,
  }
  for (const d of race.distances) {
    fields[`price.${d.id}`] = `${d.price}:-`
    fields[`name.${d.id}`] = d.name
  }
  return fields
}

/** A short status sentence (used for SEO/social description). */
export function phaseSummary(race: Race, phase: RacePhase) {
  const f = raceFields(race)
  const when = `${capitalize(f.date!)} kl ${f.startTime}`
  switch (phase) {
    case 'upcoming': return `Umeloppet ${race.year} avgörs ${f.date}. Anmälan öppnar ${f.opens}. Seedningsgrundande för Vasaloppet och Tjejvasan.`
    case 'open': return `Nu är anmälan öppen för Umeloppet ${race.year}. ${when} avgörs detta anrika skidlopp. Seedningsgrundande för Vasaloppet och Tjejvasan.`
    case 'closed':
    case 'full': return `Anmälan till Umeloppet ${race.year} är stängd. ${when} avgörs loppet vid ${race.location}.`
    case 'cancelled': return `Umeloppet ${race.year} är tyvärr inställt.`
    case 'finished': return `Tack för Umeloppet ${race.year}! Resultat finns på sidan.`
  }
}
