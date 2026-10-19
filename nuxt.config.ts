// Estilo visual (D-17 / D-29): tokens e base em app/assets/css; fontes do sistema, sem dependências.

export default defineNuxtConfig({
  compatibilityDate: '2026-10-17',
  devtools: { enabled: false },
  typescript: { strict: true },
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css', '~/assets/css/ui.css', '~/assets/css/gestao.css', '~/assets/css/detalhes.css', '~/assets/css/publico.css', '~/assets/css/cadastro.css', '~/assets/css/backoffice.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Bela Agenda',
    },
  },
  // D-14 / D-34: o navegador fala só com a origem do Nuxt; /api/** é repassado ao Django por
  // server/routes/api/[...path].ts (proxy explícito, injeta X-Bela-Proxy-Secret e X-Bela-Client-Ip).
  // Variáveis privadas lidas em tempo de execução: NUXT_BACKEND_URL e NUXT_PROXY_SECRET (nunca vão ao cliente).
  runtimeConfig: {
    backendUrl: 'http://127.0.0.1:8000',
    proxySecret: '',
  },
})
