import type { ApiError } from '~/composables/useApi'

export interface CadastroConfig { aberto: boolean, termos_versao: string }
export type MotivoSlug = null | 'invalido' | 'reservado' | 'em_uso'
export interface SlugResposta { disponivel: boolean, motivo: MotivoSlug }

export interface NovoCadastro {
  username: string
  password: string
  nome_exibicao: string
  telefone: string
  slug: string
  aceite_termos: true
  termos_versao: string
  website: string
}

/** API pública de cadastro (sem login). */
export function useCadastroApi() {
  const { request } = useApi()
  return {
    config: () => request<CadastroConfig>('/cadastro/config/'),
    slug: (slug: string) => request<SlugResposta>('/cadastro/slug/', { query: { slug } }),
    cadastrar: (corpo: NovoCadastro) =>
      request<{ status: string }>('/cadastro/', { method: 'POST', body: { ...corpo } }),
  }
}

/** Mensagem amigável por code; o texto do backend só entra quando não há tratamento próprio. */
export function mensagemCadastro(e: ApiError): string {
  switch (e.code) {
    case 'cadastro_fechado':
      return 'As novas contas estão fechadas por enquanto.'
    case 'limite_contas_pendentes':
      return 'Há muitos cadastros aguardando análise neste momento. Tente novamente mais tarde ou fale com a equipe.'
    default:
      return mensagemErro(e)
  }
}

/** Versão vigente dos termos (vem da config do cadastro); sem resposta mostra "a definir". */
export async function useVersaoTermos() {
  const api = useCadastroApi()
  const { data } = await useAsyncData('termos-versao', async () => {
    try {
      return (await api.config()).termos_versao
    }
    catch {
      return ''
    }
  })
  return { versao: computed(() => data.value || 'a definir') }
}
