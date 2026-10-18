// Esqueleto FE-01: sem CSS, sem tema, sem fontes (D-17: nenhum estilo antes da aprovação visual).
declare const process: { env: Record<string, string | undefined> } // evita @types/node (dependência não aprovada)
const backendUrl = process.env.NUXT_BACKEND_URL || 'http://127.0.0.1:8000'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-17',
  devtools: { enabled: false },
  typescript: { strict: true },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Bela Agenda',
    },
  },
  // D-14: o navegador fala só com a origem do Nuxt; /api/** é repassado ao Django (sem CORS).
  routeRules: {
    '/api/**': { proxy: `${backendUrl}/api/**` },
  },
})
