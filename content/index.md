---
title: Skidveteranerna i Västerbotten
description: Skidveteranerna i Västerbotten, huvudsida
footer: bg-slate-800
---

::page-hero{background="hero" wave="text-slate-200"}
::

<!-- Umeloppet teaser. Only the block that matches the current phase is shown. -->
::page-section{bg="bg-slate-200" width="max-w-xl" center wave="text-slate-800"}
  :::race-status{is="upcoming"}
  # Umeloppet :race{field="year"}

  Arrangeras :race{field="date"}, start kl :race{field="startTime"}. Start/mål :race{field="location"}.
  Anmälan sker via denna hemsida och öppnas den :race{field="opens"}.

  Med vänlig hälsning<br>
  Västerbottens Skidveteraner
  :::

  :::race-status{is="open"}
  # Umeloppet :race{field="year"}

  Nu är anmälan öppen för :race{field="year"} års upplaga av Umeloppet. **:race{field="date" capitalize}** avgörs detta anrika skidlopp. Seedningsgrundande för Vasaloppet och Tjejvasan.

  **Sista datum för anmälan är den :race{field="closesDate"}!**
  :::

  :::race-status{is="full"}
  # Umeloppet :race{field="year"}

  **Anmälan är nu stängd då vi nått max antal åkare.**
  Med anledning av det stora intresset för Umeloppet önskar vi att så många som har möjlighet
  hämtar nr lapp och chip under lördagen. Det kan annars bli långa köer på söndag.
  Vi finns på Forslunda mellan kl 13 - 16.

  **VÄLKOMMEN & TACK!**
  :::

  :::race-status{is="closed"}
  # Umeloppet :race{field="year"}

  Anmälan är stängd. Vi ses :race{field="date"} kl :race{field="startTime"} vid :race{field="location"}!
  :::

  :::race-status{is="cancelled"}
  # Umeloppet inställt :race{field="year"}

  **Pga snöbrist tvingas vi tyvärr ställa in Umeloppet :race{field="year"}.
  Enligt Svenska Skidförbundets regler betalar vi tillbaka 50% av anmälningsavgiften till de som redan anmält sig.
  Vi beklagar detta djupt och hoppas på bättre förutsättningar nästa år.**{.text-red-700}
  :::

  :::race-status{is="finished"}
  # Umeloppet :race{field="year"}

  Vi i Västerbottens Skidveteraner vill skicka ett stort tack till alla skidåkare som gjorde Umeloppet :race{field="year"} till en stor succé.
  Vi vill också tacka alla funktionärer som ställde upp, utan er hade det inte varit möjligt att genomföra arrangemanget.
  Ett tack till alla sponsorer och åskådare. Stort stort tack till alla och välkommen åter nästa år!
  :::

  :button-link{to="/umeloppet" label="Till loppet"}
::

::page-section{bg="bg-slate-800 text-white"}
## Senaste nyheterna

:news-grid
::
