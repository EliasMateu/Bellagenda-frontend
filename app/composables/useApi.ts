export interface ApiError {
  code: string
  message: string
  fields?: Record<string, string[]>
  status: number
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

export function useApi() {
  const csrf = useCookie('csrftoken', { readonly: true })

  async function request<T>(
    path: string,
    options: { method?: string, body?: Record<string, unknown> | FormData, query?: Record<string, unknown> } = {},
  ): Promise<T> {
    const method = (options.method || 'GET').toUpperCase()
    const headers: Record<string, string> = {}
    if (!SAFE_METHODS.includes(method) && csrf.value) {
      headers['X-CSRFToken'] = csrf.value
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
  const err = e as { statusCode?: number, status?: number, data?: Record<string, unknown> }
  const status = err.statusCode ?? err.status ?? 0
  const data = err.data
  const nested = (data && typeof data.error === 'object' ? data.error : data) as Record<string, unknown> | undefined
  return {
    code: typeof nested?.code === 'string' ? nested.code : (status ? 'erro_http' : 'erro_rede'),
    message: typeof nested?.message === 'string' ? nested.message : 'Não foi possível concluir a requisição.',
    fields: nested?.fields as Record<string, string[]> | undefined,
    status,
  }
}
