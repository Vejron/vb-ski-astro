import * as cheerio from 'cheerio'

// Track status scraped from Umeå kommuns anläggningsregister
export default defineCachedEventHandler(async () => {
  const response = await fetch('http://anlaggningsregister.umea.se/SmsGrupp.aspx?gid=16')
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Kunde inte hämta spårstatus' })
  }
  const $ = cheerio.load(await response.text())
  const rows = $('table tbody tr:not(.GridViewHeader):not(.GridViewFooter)')
  const tracks: (TrackInfo & { info: string, date: string })[] = []

  rows.each((_, row) => {
    const tds = $(row).children('td')
    if (tds.length < 2) return
    const name = $(tds[0]).text().trim()
    const info = $(tds[1]).text().trim()
    const track = trackMapping[name]
    if (!track) return
    tracks.push({
      ...track,
      date: info.substring(info.length - 19),
      info: info.substring(0, info.length - 19),
    })
  })
  return tracks
}, { maxAge: 60 * 10 })
