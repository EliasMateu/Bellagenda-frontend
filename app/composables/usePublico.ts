export interface Servico {
  id: number
  nome: string
  duracao_min: number
  preco: string
}

export interface ServicosResposta {
  nome_exibicao: string
  servicos: Servico[]
}

export interface HorariosResposta {
  servico: number
  data: string
  fuso: string
  horarios: string[]
}

export interface NovoAgendamento {
  servico: number
  inicio: string
  nome: string
  telefone: string
  observacao?: string
  consentimento: boolean
  website: string
}

export interface AgendamentoCriado {
  agendamento: {
    codigo: string
    token: string
    status: string
    inicio: string
    fim: string
    servico: string
    profissional: string
  }
}

export interface AgendamentoConsultado {
  codigo: string
  status: string
  inicio: string
  fim: string
  servico: { nome: string, duracao_min: number }
  preco: string
  profissional: string
  cliente: { nome: string, telefone: string }
  cancelamento_ate: string
  pode_cancelar: boolean
}

/** Identifica o agendamento: token OU código + telefone. */
export type Identificacao = { token: string } | { codigo: string, telefone: string }

const STATUS: Record<string, string> = {
  pendente: 'Pendente (aguardando confirmação da profissional)',
  confirmado: 'Confirmado',
  cancelado_cliente: 'Cancelado por você',
  cancelado_salao: 'Cancelado pela profissional',
  concluido: 'Concluído',
  falta: 'Falta',
}

export function rotuloStatus(status: string): string {
  return STATUS[status] ?? status
}

/** Data (dd/mm/aaaa) e hora (hh:mm) lidas direto do ISO, que já vem no fuso da profissional. */
export function formatarIso(iso: string): { data: string, hora: string } {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return { data: `${dia}/${mes}/${ano}`, hora: iso.slice(11, 16) }
}

export function formatarPreco(preco: string): string {
  const n = Number(preco)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : preco
}

export function usePublico(slug: string) {
  const { request } = useApi()
  const base = `/publico/${encodeURIComponent(slug)}`
  return {
    servicos: () => request<ServicosResposta>(`${base}/servicos/`),
    horarios: (servico: number, data: string) =>
      request<HorariosResposta>(`${base}/horarios/`, { query: { servico, data } }),
    agendar: (corpo: NovoAgendamento) =>
      request<AgendamentoCriado>(`${base}/agendamentos/`, { method: 'POST', body: { ...corpo } }),
    consultar: (id: Identificacao) =>
      request<AgendamentoConsultado>(`${base}/agendamento/consultar/`, { method: 'POST', body: { ...id } }),
    cancelar: (id: Identificacao) =>
      request<{ codigo: string, status: string }>(`${base}/agendamento/cancelar/`, { method: 'POST', body: { ...id } }),
  }
}

/** Mensagem amigável a partir do code (nunca inclui token). */
export function mensagemErro(e: ApiError): string {
  switch (e.code) {
    case 'limite_requisicoes':
      return e.retryAfter
        ? `Muitas tentativas. Tente novamente em ${e.retryAfter} segundo(s).`
        : 'Muitas tentativas. Aguarde um pouco e tente novamente.'
    case 'erro_rede':
      return 'Falha de conexão. Seus dados foram mantidos; tente enviar novamente.'
    case 'limite_agendamentos_ativos':
      return 'Este telefone já possui o máximo de agendamentos futuros. Para agendar de novo, cancele um deles.'
    default:
      return e.message
  }
}
