# skidveteraner.se

Homepage for Västerbottens Skidveteraner and Umeloppet. Built with [Nuxt](https://nuxt.com) + [Nuxt Content](https://content.nuxt.com) and deployed to Netlify on every push to `main`.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (pages are prerendered)
```

The signup emails need `SMTP_USER` and `SMTP_PASS` (Brevo/SendinBlue). Set them in Netlify, or in a local `.env` (see `.env.example`).

## Inför nytt år (yearly checklist)

1. **`content/umeloppet.yml`**: update `year`, `edition`, `date`, `registration.opens`/`closes`, `payByDate`, prices and so on. All dates, prices and texts on the site and in the confirmation emails come from here.
2. Set `registration.status: auto`. Registration then opens and closes by itself on the dates, with no new deploy needed.
3. Put new PDFs (inbjudan, PM, startlista, resultat) in `public/files/` and link them under `documents:`. Empty means the button is hidden.
4. Swap sponsor logos under `sponsors:` if needed (e.g. the yearly Vasaloppet logo in `public/assets/`).
5. If needed, adjust the texts in `content/index.md` and `content/umeloppet.md`.

Special cases are handled with `registration.status`:

| status      | effect |
|-------------|--------|
| `auto`      | open between `opens` and `closes` |
| `open`      | force open |
| `closed`    | force closed |
| `full`      | closed, "max antal åkare" text |
| `cancelled` | race cancelled, cancellation text everywhere |

After race day the phase becomes `finished` automatically (the "tack" texts).

## Markdown components

Pages are written in markdown (`content/*.md`) with these components:

| Component | Example |
|---|---|
| Race value inline | `:race{field="date"}`, `:race{field="date" capitalize}`. Fields: `year edition date dateShort weekday startTime location opens closes closesDate payBy maxParticipants swish plusgiro price.long name.long` |
| Show text only in a phase | `::race-status{is="open,upcoming"}` … `::` (phases: `upcoming open closed full cancelled finished`) |
| Section | `::page-section{bg="bg-slate-100" width="max-w-3xl" center wave="text-slate-200" wave-top="text-slate-200" id="info"}` … `::` |
| Header | `::page-hero{title="UMELOPPET" background="map" wave="text-slate-100"}` (background: `hero`, `map`, `track`) |
| Signup form | `::anmalan` … `::`. The form shows while open; otherwise the text inside is shown |
| Info box | `::info-card{title="Innan loppet"}` … `::` |
| Race facts | `:race-facts` |
| Buttons in header | `:link-pills` |
| Sponsors | `:sponsors` |
| Track map | `:track-map` |
| Track status | `:track-status` |
| News | `:news-grid{limit="6"}`, `:news-list` |
| Button | `:button-link{to="/umeloppet" label="Till loppet"}` |

Nested components get one more colon (`:::race-status` inside `::page-section`).

## News

New posts: `content/blog/YYYY-MM-DD-name.md` with frontmatter:

```yaml
---
title: arsmote-2027
displaytitle: Årsmöte 2027
date: 2027-04-20T12:00:00.000Z
thumbnail: /images/uploads/bild.webp
description: "Kort introtext"
---
```

Images go in `public/images/uploads/`.

## Structure

```
content/            texts + umeloppet.yml (race config)
app/components/content/   markdown components
app/composables/useRace.ts  race data + current phase
shared/race.ts      phase logic and date formatting (used by both site and API)
server/api/         sign-up (registration email) and tracks (track status)
```
