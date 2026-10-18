// Estilo visual (D-17 / D-29): tokens e base em app/assets/css; fontes do sistema, sem dependências.
declare const process: { env: Record<string, string | undefined> } // evita @types/node (dependência não aprovada)
const backendUrl = process.env.NUXT_BACKEND_URL || 'http://127.0.0.1:8000'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-17',
  devtools: { enabled: false },
  typescript: { strict: true },
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css', '~/assets/css/ui.css', '~/assets/css/gestao.css', '~/assets/css/detalhes.css'],
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
