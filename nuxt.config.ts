export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: true },

  modules: ['@nuxt/content', '@nuxtjs/tailwindcss', '@vueuse/nuxt', '@nuxtjs/sitemap'],

  css: ['~/assets/css/global.css'],

  site: { url: 'https://skidveteraner.se', name: 'Västerbottens skidveteraner' },

  app: {
    head: {
      htmlAttrs: { lang: 'sv' },
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  content: {
    experimental: { sqliteConnector: 'native' },
  },

  routeRules: {
    // Old Astro URL (Nuxt Content turns "ö" into "o")
    '/blog/2023-04-23-arsmöte-2023': { redirect: { to: '/blog/2023-04-23-arsmote-2023', statusCode: 301 } },
  },

  nitro: {
    preset: 'netlify',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/umeloppet', '/nyheter', '/spar-status'],
    },
    // The API reads content/umeloppet.yml directly (no database needed in the function)
    serverAssets: [{ baseName: 'race', dir: '../content', pattern: 'umeloppet.yml' }],
  },
})
