export type StatusConta = 'pendente' | 'ativa' | 'suspensa' | 'rejeitada'
export type AcaoConta = 'aprovar' | 'rejeitar' | 'suspender' | 'reativar'

export interface ContaBackoffice {
  id: number
  username: string
  nome_exibicao: string
  slug: string
  telefone: string | null
  status: StatusConta
  cadastrado_em: string
  aprovado_por: string | null
  aprovado_em: string | null
  motivo_status: string
  termos_versao: string
  termos_aceitos_em: string | null
}

export interface ContasResposta {
  contagens: Record<StatusConta, number>
  resultados: ContaBackoffice[]
}

/** Ações permitidas por situação (espelha a matriz do backend: pendente→ativa|rejeitada, ativa↔suspensa). */
export const ACOES_CONTA: Record<StatusConta, AcaoConta[]> = {
  pendente: ['aprovar', 'rejeitar'],
  ativa: ['suspender'],
  suspensa: ['reativar'],
  rejeitada: [],
}

export const ROTULO_ACAO: Record<AcaoConta, string> = {
  aprovar: 'Aprovar', rejeitar: 'Rejeitar', suspender: 'Suspender', reativar: 'Reativar',
}
export const ROTULO_STATUS: Record<StatusConta, string> = {
  pendente: 'Pendente', ativa: 'Ativa', suspensa: 'Suspensa', rejeitada: 'Rejeitada',
}

export const FUSO_BACKOFFICE = 'America/Sao_Paulo'

/** API do backoffice (só superusuário; qualquer outro recebe 404). Nunca toca em clientes ou agendamentos. */
export function useBackofficeApi() {
  const { request } = useApi()
  return {
    contas: (query: { status?: string, q?: string }) => request<ContasResposta>('/backoffice/contas/', { query }),
    acao: (id: number, acao: AcaoConta, motivo?: string) =>
      request<ContaBackoffice>(`/backoffice/contas/${id}/${acao}/`, { method: 'POST', body: motivo ? { motivo } : {} }),
  }
}

export function linkWhatsAppConta(c: ContaBackoffice): string {
  const texto = `Olá, ${c.nome_exibicao}! Aqui é da equipe do Bela Agenda sobre o seu cadastro.`
  return `https://wa.me/${(c.telefone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
}

export function dataHoraSP(iso: string | null): string {
  if (!iso) return '—'
  const { data, hora } = formatarNoFuso(iso, FUSO_BACKOFFICE)
  return `${data} às ${hora}`
}
