
import { createTransport } from 'nodemailer'
import { Handler } from '@netlify/functions'

const ReceiverMail = 'trude.hietha@umea.riksnet.se'
//const ReceiverMail = 'bjorn.yttergren@gmail.com'
interface Anmalan {
  name: string
  email: string
  club: string
  class: string
  distance: "long" | "short" | "para"
  vasa: string
  paymethod: "swish" | "bg"
}

const transporter = createTransport({
  service: 'SendinBlue', // no need to set host or port etc.
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const translateDistance = (distance: "long" | "short" | "para") => {
  switch (distance) {
    case 'long':
      return '40 Km'
    case 'short':
      return '20 Km'
    case 'para':
      return '5 km Paraklass'

    default:
      return 'Okänd'
  }
}

const getCost = (distance: "long" | "short" | "para") => {
  switch (distance) {
    case 'long':
      return '400'
    case 'short':
      return '300'
    case 'para':
      return '100'

    default:
      return '400'
  }
}

const formatAnmalan = (data: Anmalan) => {
  return `
  <table>
  <tr>
    <th style="text-align: left;">Namn</th>
    <td>${data.name}</td>
  </tr>
  <tr>
    <th style="text-align: left;">E-post</th>
    <td>${data.email}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Klubb</th>
    <td>${data.club}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Klass</th>
    <td>${data.class}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Sträcka</th>
    <td>${translateDistance(data.distance)}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Eventuell Vasa ID</th>
    <td>${data.vasa}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Betalning via</th>
    <td>${data.paymethod}</td>
  </tr>
</table>
  `
}

const formatVerify = (data: Anmalan) => {
  return `
  <p>Här kommer en bekräftelse på din anmälan till Umeloppet 2023.<br>
  Kom ihåg att betala avgiften så snart som möjligt men senast 1:a Februari 2023.<br>
  ${getCost(data.distance)}:- till swish: 123 541 1848 eller pg: 780801-7</p>
  <p>Detta är ett automatgenererat mail och går inte att svara på</p>
  <table>
  <tr>
    <th style="text-align: left;">Namn</th>
    <td>${data.name}</td>
  </tr>
  <tr>
    <th style="text-align: left;">E-post</th>
    <td>${data.email}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Klubb</th>
    <td>${data.club}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Klass</th>
    <td>${data.class}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Sträcka</th>
    <td>${translateDistance(data.distance)}</td>
  </tr>
  <tr>
    <th style="text-align: left;">Eventuell Vasa ID</th>
    <td>${data.vasa}</td>
  </tr>
</table>
  `
}

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: "Method not allowed" }
  } else {
    const bodyJSON = JSON.parse(event.body) as Anmalan
    try {


      const anmalan = {
        from: 'anmalan@skidveteraner.se',
        to: ReceiverMail,
        subject: '🔥Anmälan för ' + bodyJSON.name + ' till Umeloppet 2023',
        text: `Din läsare stödjer inte html... bummer`,
        html: formatAnmalan(bodyJSON)
      };

      const res1 = await transporter.sendMail(anmalan)

      // SEND VERIFY EMAIL LINK
      const verify = {
        from: 'anmalan@skidveteraner.se',
        to: bodyJSON.email,
        subject: '🔥Din anmälan till Umeloppet 2023',
        text: `Din läsare stödjer inte html... bummer`,
        html: formatVerify(bodyJSON)
      }

      const res2 = await transporter.sendMail(verify)

      return { statusCode: 200, body: JSON.stringify(res2) }
    } catch (err) {
      return { statusCode: 500, body: err.toString() }
    }
  }

}


export { handler }