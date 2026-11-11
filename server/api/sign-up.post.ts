import { createTransport } from 'nodemailer'
import { racePhase, swedishDate, type Race } from '#shared/race'

interface Anmalan {
  name: string
  email: string
  club: string
  class: string
  distance: string
  vasa: string
  paymethod: 'swish' | 'pg'
}

const transporter = createTransport({
  service: 'SendinBlue',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const escape = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]!)

const row = (label: string, value: unknown) =>
  `<tr><th style="text-align: left;">${label}</th><td>${escape(value)}</td></tr>`

const formatTable = (data: Anmalan, race: Race, withPayment: boolean) => `
  <table>
    ${row('Namn', data.name)}
    ${row('E-post', data.email)}
    ${row('Klubb', data.club)}
    ${row('Klass', data.class)}
    ${row('Sträcka', race.distances.find(d => d.id === data.distance)?.name)}
    ${row('Eventuell Vasa ID', data.vasa)}
    ${withPayment ? row('Betalning via', data.paymethod === 'pg' ? 'PlusGirot' : 'Swish') : ''}
  </table>`

const formatVerify = (data: Anmalan, race: Race) => {
  const price = race.distances.find(d => d.id === data.distance)?.price
  return `
  <p>Här kommer en bekräftelse på din anmälan till Umeloppet ${race.year}.<br>
  Kom ihåg att betala avgiften så snart som möjligt men senast ${swedishDate(race.payByDate)}.<br>
  ${price}:- till swish: ${race.payment.swish} eller pg: ${race.payment.plusgiro}</p>
  <p>Detta är ett automatgenererat mail och går inte att svara på</p>
  ${formatTable(data, race, false)}`
}

export default defineEventHandler(async (event) => {
  const race = await getRace()

  if (racePhase(race) !== 'open') {
    throw createError({ statusCode: 403, statusMessage: 'Closed', message: 'Anmälan är stängd' })
  }

  const body = await readBody<Partial<Anmalan>>(event)
  const distance = race.distances.find(d => d.id === body?.distance)
  const valid = body
    && typeof body.name === 'string' && body.name.trim()
    && typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
    && distance
    && typeof body.class === 'string' && distance.classes.includes(body.class)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Bad request', message: 'Ogiltig anmälan' })
  }

  const data: Anmalan = {
    name: body.name!.trim(),
    email: body.email!.trim(),
    club: String(body.club ?? '').trim(),
    class: body.class!,
    distance: body.distance!,
    vasa: String(body.vasa ?? '').trim(),
    paymethod: body.paymethod === 'pg' ? 'pg' : 'swish',
  }

  try {
    await transporter.sendMail({
      from: 'anmalan@skidveteraner.se',
      to: race.receiverEmail,
      subject: `🔥Anmälan för ${data.name} till Umeloppet ${race.year}`,
      text: 'Din läsare stödjer inte html... bummer',
      html: formatTable(data, race, true),
    })

    await transporter.sendMail({
      from: 'anmalan@skidveteraner.se',
      to: data.email,
      subject: `🔥Din anmälan till Umeloppet ${race.year}`,
      text: 'Din läsare stödjer inte html... bummer',
      html: formatVerify(data, race),
    })
  }
  catch (err) {
    console.error(err)
    throw createError({ statusCode: 500, statusMessage: 'Mail error', message: 'Vi kunde inte slutföra din anmälan' })
  }

  return { ok: true }
})
