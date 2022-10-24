
import { createTransport } from 'nodemailer'
import { Handler } from '@netlify/functions'

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

const formatMessage = (data: Anmalan) => {
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

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: "Method not allowed" }
  } else {
    const bodyJSON = JSON.parse(event.body) as Anmalan
    try {

      // SEND VERIFY EMAIL LINK
      let message = {
        from: 'anmalan@skidveteraner.se',
        to: 'trude.hietha@umea.riksnet.se',
        subject: '🔥Anmälan för ' + bodyJSON.name + ' till Umeloppet 2023',
        text: `Din läsare stödjer inte html... bummer`,
        html: formatMessage(bodyJSON)
      };

      const res = await transporter.sendMail(message)
      return { statusCode: 200, body: JSON.stringify(res) }
    } catch (err) {
      return { statusCode: 500, body: err.toString() }
    }
  }

}


export { handler }