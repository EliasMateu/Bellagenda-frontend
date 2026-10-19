// Proxy explícito de /api/** para o Django (D-14 / D-34). Na Vercel o proxy de routeRules vira rewrite da plataforma,
// que não deixa injetar cabeçalhos; aqui o servidor Nuxt injeta X-Bela-Proxy-Secret e X-Bela-Client-Ip.
// Nunca registra cookies, tokens, o segredo nem o endereço interno do backend.

import type { H3Event } from 'h3'

// Só estes cabeçalhos do navegador atravessam (lista de permissão): host, connection, content-length,
// x-forwarded-* e qualquer x-bela-* do cliente ficam de fora, então não podem ser forjados.
const REPASSAR = [
  'accept', 'accept-language', 'content-type', 'cookie', 'origin', 'referer', 'user-agent', 'x-csrftoken',
  'if-none-match', 'if-modified-since', 'cache-control',
]
const SEM_CORPO = new Set(['GET', 'HEAD', 'OPTIONS'])
const TEMPO_LIMITE_MS = 20_000

function ehIp(valor: string): boolean {
  const v4 = valor.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) return v4.slice(1).every(o => Number(o) <= 255)
  if (!valor.includes(':') || !/^[0-9a-f:.]+$/i.test(valor)) return false
  try {
    new URL(`http://[${valor}]/`)
    return true
  }
  catch {
    return false
  }
}

function ipDoCliente(event: H3Event): string | undefined {
  const candidatos = [
    getRequestHeader(event, 'x-vercel-forwarded-for')?.split(',')[0],
    getRequestHeader(event, 'x-real-ip'),
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0],
    getRequestIP(event, { xForwardedFor: false }),
  ]
  return candidatos.map(c => c?.trim()).find(c => !!c && ehIp(c))
}

function erroJson(event: H3Event, status: number, message: string) {
  setResponseStatus(event, status)
  setResponseHeader(event, 'cache-control', 'no-store')
  return { code: 'erro_gateway', message, fields: {} }
}

export default defineEventHandler(async (event) => {
  const { backendUrl, proxySecret } = useRuntimeConfig(event)
  let base: URL
  try {
    base = new URL(String(backendUrl))
  }
  catch {
    console.error('[proxy] NUXT_BACKEND_URL ausente ou inválida')
    return erroJson(event, 502, 'Servidor indisponível no momento. Tente novamente em instantes.')
  }

  // Garante que o destino continua sendo o /api/ do backend (sem "..", "//host" ou outra origem).
  const alvo = new URL(event.path, base)
  if (alvo.origin !== base.origin || !alvo.pathname.startsWith('/api/')) {
    return erroJson(event, 404, 'Não encontrado.')
  }

  const headers = new Headers()
  for (const nome of REPASSAR) {
    const valor = getRequestHeader(event, nome)
    if (valor) headers.set(nome, valor)
  }
  if (proxySecret) headers.set('x-bela-proxy-secret', String(proxySecret))
  const ip = ipDoCliente(event)
  if (ip) headers.set('x-bela-client-ip', ip)
  const https = getRequestProtocol(event, { xForwardedProto: true }) === 'https'
  if (https) headers.set('x-forwarded-proto', 'https')

  const metodo = event.method.toUpperCase()
  const corpo = SEM_CORPO.has(metodo) ? undefined : await readRawBody(event, false).catch(() => undefined)

  try {
    return await sendProxy(event, alvo.toString(), {
      fetchOptions: {
        method: metodo,
        headers,
        body: corpo,
        redirect: 'manual',
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      },
      // Redirecionamentos do Django (ex.: APPEND_SLASH) voltam relativos, sem expor o endereço interno.
      onResponse: (ev, resposta) => {
        const destino = resposta.headers.get('location')
        if (!destino) return
        try {
          const u = new URL(destino, base)
          if (u.origin === base.origin) setResponseHeader(ev, 'location', `${u.pathname}${u.search}${u.hash}`)
        }
        catch { /* mantém como veio */ }
      },
    })
  }
  catch (e) {
    const causa = (e as { cause?: { name?: string } }).cause
    const tempo = causa?.name === 'TimeoutError' || causa?.name === 'AbortError'
    console.error(`[proxy] ${tempo ? 'tempo esgotado' : 'backend indisponível'} em ${metodo} /api/...`)
    if (event.node.res.headersSent) return
    return tempo
      ? erroJson(event, 504, 'O servidor demorou para responder. Tente novamente.')
      : erroJson(event, 502, 'Servidor indisponível no momento. Tente novamente em instantes.')
  }
})
