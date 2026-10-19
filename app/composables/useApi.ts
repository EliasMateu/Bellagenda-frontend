export interface ApiError {
  code: string
  message: string
  fields?: Record<string, string[]>
  status: number
  /** Campos extras do backend (ex.: sugestoes do 409 conflito_horario). */
  extra: Record<string, unknown>
  /** Segundos do cabeçalho Retry-After, se existir. */
  retryAfter?: number
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

export function useApi() {
  const csrfSsr = import.meta.server ? useCookie('csrftoken', { readonly: true }) : null

  // No navegador lê o cookie na hora do envio (ele pode ter sido definido após o carregamento da página).
  function lerCsrf(): string | undefined {
    if (import.meta.client) {
      const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
      return m?.[1] ? decodeURIComponent(m[1]) : undefined
    }
    return csrfSsr?.value ?? undefined
  }

  async function request<T>(
    path: string,
    options: { method?: string, body?: Record<string, unknown> | FormData, query?: Record<string, unknown> } = {},
  ): Promise<T> {
    const method = (options.method || 'GET').toUpperCase()
    const headers: Record<string, string> = {}
    const csrf = lerCsrf()
    if (!SAFE_METHODS.includes(method) && csrf) {
      headers['X-CSRFToken'] = csrf
    }
    // No SSR o navegador não participa: repassa cookies da requisição de entrada.
    if (import.meta.server) {
      Object.assign(headers, useRequestHeaders(['cookie']))
    }
    try {
      return await $fetch<T>(`/api/v1${path}`, {
        method: method as 'GET',
        body: options.body,
        query: options.query,
        headers,
        credentials: 'include',
      })
    }
    catch (e: unknown) {
      throw normalizeError(e)
    }
  }

  return { request }
}

function normalizeError(e: unknown): ApiError {
  const err = e as {
    statusCode?: number
    status?: number
    data?: Record<string, unknown>
    response?: { headers?: Headers }
  }
  const status = err.statusCode ?? err.status ?? 0
  const data = err.data
  const nested = (data && typeof data.error === 'object' ? data.error : data) as Record<string, unknown> | undefined
  const { code, message, fields, ...extra } = nested ?? {}
  const retry = Number(err.response?.headers?.get?.('retry-after'))
  return {
    code: typeof code === 'string' ? code : (status ? 'erro_http' : 'erro_rede'),
    message: typeof message === 'string' ? message : 'Não foi possível concluir a requisição.',
    fields: fields as Record<string, string[]> | undefined,
    status,
    extra,
    retryAfter: Number.isFinite(retry) && retry > 0 ? retry : undefined,
  }
}
