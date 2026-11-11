import * as cheerio from "cheerio";
import fetch from "node-fetch";
import { Handler } from '@netlify/functions'

const mapping = {
  "Brattby-Gubböle skidspår, 3,6 km (elljus)": {
    name: "Brattby-Gubböle",
    length: 3.6,
    electric: true,
    payed: false,
    location: [63.8947518, 19.9063089]
  },
  "Bräntevägens skidspår, 0,7 km (Holmsund)": {
    name: "Bräntevägen",
    length: 0.7,
    electric: false,
    payed: false,
    location: [63.70083, 20.382278]
  },
  "Bräntevägens skidspår, 1,5 km (elljus, Holmsund)": {
    name: "Bräntevägen",
    length: 1.5,
    electric: true,
    payed: false,
    location: [63.70083, 20.382278]
  },
  "Bräntevägens skidspår, 3,3 km (elljus, Holmsund)": {
    name: "Bräntevägen",
    length: 3.3,
    electric: true,
    payed: false,
    location: [63.70083, 20.382278]
  },
  "Bräntevägens skidspår, 4,4 km (elljus, Holmsund)": {
    name: "Bräntevägen",
    length: 4.4,
    electric: true,
    payed: false,
    location: [63.70083, 20.382278]
  },
  "Ersboda skidspår, 1,5 km (elljus)": {
    name: "Ersboda",
    length: 1.5,
    electric: true,
    payed: false,
    location: [63.863704, 20.314236]
  },
  "Ersboda skidspår, 4,1 km (elljus)": {
    name: "Ersboda",
    length: 4.1,
    electric: true,
    payed: false,
    location: [63.863704, 20.314236]
  },
  "Ersbodaängarnas skidspår": {
    name: "Ersbodaängarna",
    length: 1,
    electric: false,
    payed: false,
    location: [63.859932, 20.317175]
  },
  "Flurkmarks skidspår, 2,3 km (elljus)": {
    name: "Flurkmark",
    length: 2.3,
    electric: true,
    payed: false,
    location: [63.982226, 20.217944]
  },
  "Gimonäs skidspår, 2,2 km (elljus)": {
    name: "Gimonäs",
    length: 2.2,
    electric: true,
    payed: false,
    location: [63.79438, 20.316703]
  },
  "Gimonäs skidspår, 3,5 km (elljus)": {
    name: "Gimonäs",
    length: 3.5,
    electric: true,
    payed: false,
    location: [63.79438, 20.316703]
  },
  "Gimonäs skidspår, 9 km": {
    name: "Gimonäs",
    length: 9,
    electric: false,
    payed: false,
    location: [63.79438, 20.316703]
  },
  "Holmsunds golfbana skidspår, 7,5 km (Holmsund)": {
    name: "Holmsunds golfbana",
    length: 7.5,
    electric: false,
    payed: false,
    location: [63.716003, 20.399015]
  },
  "Hällnäs skidspår, 2,5 km": {
    name: "Hällnäs",
    length: 2.5,
    electric: false,
    payed: false,
    location: [64.314567, 19.623985]
  },
  "Hörnefors skidspår, 1,4 km (elljus)": {
    name: "Hörnefors",
    length: 1.4,
    electric: true,
    payed: false,
    location: [63.62255, 19.891562]
  },
  "Hörnefors skidspår, 2,2 km (elljus)": {
    name: "Hörnefors",
    length: 2.2,
    electric: true,
    payed: false,
    location: [63.62255, 19.891562]
  },
  "Hörnefors skidspår, 3,6 km (elljus)": {
    name: "Hörnefors",
    length: 3.6,
    electric: true,
    payed: false,
    location: [63.62255, 19.891562]
  },
  "I 20:s skidspår, 10 km": {
    name: "I20",
    length: 10,
    electric: false,
    payed: false,
    location: [63.838521, 20.271406]
  },
  "I 20:s skidspår, 5 km": {
    name: "I20",
    length: 5,
    electric: false,
    payed: false,
    location: [63.838521, 20.271406]
  },
  "Kläppaspåret, 1,5 km (elljus)": {
    name: "Kläppaspåret",
    length: 1.5,
    electric: true,
    payed: false,
    location: [64.208655, 19.724793]
  },
  "Kläppaspåret, 2,5 km (elljus)": {
    name: "Kläppaspåret",
    length: 2.5,
    electric: true,
    payed: false,
    location: [64.208655, 19.724793]
  },
  "Mariehemsängarnas skidspår, 2,6 km": {
    name: "Mariehemsängarna",
    length: 2.6,
    electric: false,
    payed: false,
    location: [63.841444, 20.313689]
  },
  "Nydala hund- och pulkskidspår, 8,6 km": {
    name: "Nydala hund- och pulkspår",
    length: 8.6,
    electric: false,
    payed: false,
    dogs: true,
    location: [63.837116, 20.344158]
  },
  "Nydala konstsnöspår 1.2 km (elljus)": {
    name: "Nydala konstsnöspår",
    length: 1.2,
    electric: true,
    payed: true,
    location: [63.838786, 20.342646]
  },
  "Nydala konstsnöspår 2.1 km (elljus)": {
    name: "Nydala konstsnöspår",
    length: 2.1,
    electric: true,
    payed: true,
    location: [63.838786, 20.342646]
  },
  "Nydala skidspår, 10 km": {
    name: "Nydala",
    length: 10,
    electric: false,
    payed: false,
    location: [63.838786, 20.342646]
  },
  "Nydala skidspår, 5 km (elljus)": {
    name: "Nydala",
    length: 5,
    electric: true,
    payed: false,
    location: [63.838786, 20.342646]
  },
  "Nydala skidspår, 6,4 km": {
    name: "Nydala",
    length: 6.4,
    electric: false,
    payed: false,
    location: [63.838786, 20.342646]
  },
  "Obbola skidspår, 1,5 km": {
    name: "Obbola",
    length: 1.5,
    electric: false,
    payed: false,
    location: []
  },
  "Obbola skidspår, 3,2 km (elljus)": {
    name: "Obbola",
    length: 3.2,
    electric: true,
    payed: false,
    location: [63.698239, 20.29737]
  },
  "Olles spår, 11,4 km": {
    name: "Olles",
    length: 11.4,
    electric: false,
    payed: false,
    location: [63.86255, 20.146608]
  },
  "Olles spår, 5 km": {
    name: "Olles",
    length: 5,
    electric: false,
    payed: false,
    location: [63.86255, 20.146608]
  },
  "Olles spår, 9,4 km": {
    name: "Olles",
    length: 9.4,
    electric: false,
    payed: false,
    location: [63.86255, 20.146608]
  },
  "Röbäcks skidspår, 1,3 km (elljus)": {
    name: "Röbäck",
    length: 1.3,
    electric: true,
    payed: false,
    location: [63.804323, 20.190736]
  },
  "Röbäcks skidspår, 2,4 km (elljus)": {
    name: "Röbäck",
    length: 2.4,
    electric: true,
    payed: false,
    location: [63.804323, 20.190736]
  },
  "Röbäcks skidspår, 5,3 km": {
    name: "Röbäck",
    length: 5.3,
    electric: false,
    payed: false,
    location: [63.804323, 20.190736]
  },
  "Rödbergets skidspår, 1,6 km (elljus)": {
    name: "Rödberget",
    length: 1.6,
    electric: true,
    payed: false,
    location: [63.843516, 20.207999]
  },
  "Rödåsel Äventyrsparken skidspår, 7 km (elljus)": {
    name: "Rödåsel Äventyrsparken",
    length: 7,
    electric: true,
    payed: false,
    location: [64.089017, 19.953811]
  },
  "Skivsjö skidspår, 1 km (elljus)": {
    name: "Skivsjö",
    length: 1,
    electric: true,
    payed: false,
    location: [64.130299, 19.298258]
  },
  "Skivsjö skidspår, 2,5 km (elljus)": {
    name: "Skivsjö",
    length: 2.5,
    electric: true,
    payed: false,
    location: [64.130299, 19.298258]
  },
  "Stadslidens skidspår, 1,9 km (elljus)": {
    name: "Stadsliden",
    length: 1.9,
    electric: true,
    payed: false,
    location: [63.829153, 20.286974]
  },
  "Stadslidens skidspår, 10 km (elljus)": {
    name: "Stadsliden",
    length: 10,
    electric: true,
    payed: false,
    location: [63.829153, 20.286974]
  },
  "Stadslidens skidspår, 3,1 km (elljus)": {
    name: "Stadsliden",
    length: 3.1,
    electric: true,
    payed: false,
    location: [63.829153, 20.286974]
  },
  "Stadslidens skidspår, 3,6 km (elljus)": {
    name: "Stadsliden",
    length: 3.6,
    electric: true,
    payed: false,
    location: [63.829153, 20.286974]
  },
  "Stadslidens skidspår, 5 km (elljus)": {
    name: "Stadsliden",
    length: 5,
    electric: true,
    payed: false,
    location: [63.829153, 20.286974]
  },
  "Strycksele skidspår, 2,5 km (elljus)": {
    name: "Strycksele",
    length: 2.5,
    electric: true,
    payed: false,
    location: [64.374907, 19.399881]
  },
  "Sävars skidspår, 3,7 km (elljus)": {
    name: "Sävar",
    length: 3.7,
    electric: true,
    payed: false,
    location: [63.907198, 20.542138]
  },
  "Tegs skidspår, 1,4 km (elljus)": {
    name: "Teg",
    length: 1.4,
    electric: true,
    payed: false,
    location: [63.816715, 20.234306]
  },
  "Tegsnäsets skidspår, 5 km, elljus": {
    name: "Tegsnäset",
    length: 5,
    electric: true,
    payed: false,
    location: [64.232116, 19.358039]
  },
  "Tvärålunds skidspår, 1,5 km (elljus)": {
    name: "Tvärålund",
    length: 1.5,
    electric: true,
    payed: false,
    location: [64.098996, 19.661601]
  },
  "Umedalens skidspår, 2 km (elljus)": {
    name: "Umedalen",
    length: 2,
    electric: true,
    payed: false,
    location: [63.840233, 20.173151]
  },
  "Vindeln-Ånäset-spåret, 3,5 km": {
    name: "Vindeln-Ånäset",
    length: 3.5,
    electric: false,
    payed: false,
    location: [64.24245, 20.019193]
  },
  "Åmsele skidspår, 2,5 km (elljus)": {
    name: "Åmsele",
    length: 2.5,
    electric: true,
    payed: false,
    location: [64.532349, 19.35099]
  },
  "Överrödå väster om älven skidspår 10,0 km": {
    name: "Överrödå",
    length: 10,
    electric: false,
    payed: false,
    location: [64.08927, 19.944906]
  },
};

async function doIt() {
  const response = await fetch(
    "http://anlaggningsregister.umea.se/SmsGrupp.aspx?gid=16"
  );
  const body = await response.text();
  const $ = cheerio.load(body);
  const rows = $("table tbody tr:not(.GridViewHeader):not(.GridViewFooter)");
  const tracks = [];
  rows.each((i, row) => {
    console.log(i);
    let trackInfo = {
      name: "",
      length: 0,
      electric: false,
      payed: false,
      info: "",
      date: "",
    };
    $(row)
      .children("td")
      .each((idx, td) => {
        if (idx == 0) {
          const name = $(td).text().trim();
          trackInfo = { ...mapping[name] };
        }
        if (idx == 1) {
          const info = $(td, "span").text().trim();
          trackInfo.date = info.substring(info.length - 19);
          trackInfo.info = info.substring(0, info.length - 19);
          tracks.push(trackInfo);
        }
      });
  });
  return tracks;
}

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: "Method not allowed" }
  } else {
    try {

      const tracks = await doIt();


      return { statusCode: 200, body: JSON.stringify(tracks) }
    } catch (err) {
      return { statusCode: 500, body: err.toString() }
    }
  }

}

export { handler }