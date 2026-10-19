import type { ApiError } from '~/composables/useApi'

// ---------------------------------------------------------------- tipos

export interface Sessao {
  id: number
  username: string
  is_superuser?: boolean
  profissional?: { nome_exibicao: string, slug: string, status: string }
}

export interface ClienteResumo { id: number, nome: string, telefone: string }

export interface AgendamentoPainel {
  id: number
  cliente: ClienteResumo
  servico: { id: number, nome: string, duracao_min: number }
  inicio: string
  fim: string
  fim_ocupado: string
  status: string
  preco_cobrado: string
  codigo_curto: string
  origem: string
  observacao_cliente: string
}

export interface ServicoPainel { id: number, nome: string, duracao_min: number, preco: string, ativo: boolean }
export interface HorarioTrabalho { id: number, dia_semana: number, inicio: string, fim: string }
export interface Bloqueio { id: number, inicio: string, fim: string, motivo: string }
export interface ClientePainel {
  id: number
  nome: string
  telefone: string
  observacoes: string
  consentimento_em: string | null
  anonimizado_em: string | null
}
export interface ContatoImportar { nome: string, telefone: string }
export interface ItemImportacao {
  indice: number
  status: 'novo' | 'duplicado' | 'invalido'
  telefone: string | null
  nome: string
  motivo: null | 'ja_cadastrado' | 'repetido_na_lista' | 'telefone_invalido' | 'nome_invalido'
  cliente_existente: string | null
}
export interface RespostaImportacao {
  simulacao: boolean
  resumo: { total: number, novos: number, duplicados: number, invalidos: number }
  itens: ItemImportacao[]
  criados: number
}
export interface Configuracao {
  timezone: string
  antecedencia_min_cancelamento_h: number
  antecedencia_min_agendamento_h: number
  janela_max_dias: number
  intervalo_entre_atendimentos_min: number
  confirmacao_automatica: boolean
}

export const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

export const STATUS_AGENDAMENTO = ['pendente', 'confirmado', 'concluido', 'falta', 'cancelado_cliente', 'cancelado_salao']

/** Ações válidas por status (espelha Agendamento.TRANSICOES do backend + remarcar). */
export type AcaoAgendamento = 'confirmar' | 'recusar' | 'cancelar' | 'cancelar_cliente' | 'concluir' | 'faltou' | 'remarcar'

export const ACOES_POR_STATUS: Record<string, AcaoAgendamento[]> = {
  pendente: ['confirmar', 'recusar', 'remarcar'],
  confirmado: ['concluir', 'faltou', 'cancelar', 'cancelar_cliente', 'remarcar'],
}

// ---------------------------------------------------------------- datas no fuso da profissional

function partes(data: Date, timeZone: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  return Object.fromEntries(fmt.formatToParts(data).map(p => [p.type, p.value]))
}

/** Valor para <input type="datetime-local"> (AAAA-MM-DDTHH:mm) de um instante, no fuso dado. */
export function paraLocal(iso: string, timeZone: string): string {
  const p = partes(new Date(iso), timeZone)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

export function formatarNoFuso(iso: string, timeZone: string): { data: string, hora: string } {
  const p = partes(new Date(iso), timeZone)
  return { data: `${p.day}/${p.month}/${p.year}`, hora: `${p.hour}:${p.minute}` }
}

/** Converte "AAAA-MM-DDTHH:mm" (hora de parede no fuso) para ISO com deslocamento. */
export function isoNoFuso(local: string, timeZone: string): string {
  const [d = '', t = '00:00'] = local.split('T')
  const [y = 0, mo = 1, da = 1] = d.split('-').map(Number)
  const [h = 0, mi = 0] = t.split(':').map(Number)
  const alvo = Date.UTC(y, mo - 1, da, h, mi)
  const deslocamento = (instante: number) => {
    const p = partes(new Date(instante), timeZone)
    const comoUtc = Date.UTC(+(p.year ?? 0), +(p.month ?? 1) - 1, +(p.day ?? 1), +(p.hour ?? 0), +(p.minute ?? 0), +(p.second ?? 0))
    return Math.round((comoUtc - Math.floor(instante / 1000) * 1000) / 60000)
  }
  const off = deslocamento(alvo - deslocamento(alvo) * 60000)
  const sinal = off < 0 ? '-' : '+'
  const abs = Math.abs(off)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `${d}T${t}:00${sinal}${hh}:${mm}`
}

export function hojeNoFuso(timeZone: string): string {
  const p = partes(new Date(), timeZone)
  return `${p.year}-${p.month}-${p.day}`
}

export function somarDias(ymd: string, dias: number): string {
  const [y = 0, m = 1, d = 1] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** Segunda-feira da semana de uma data AAAA-MM-DD. */
export function segundaDaSemana(ymd: string): string {
  const [y = 0, m = 1, d = 1] = ymd.split('-').map(Number)
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 // 0 = segunda
  return somarDias(ymd, -dow)
}

// ---------------------------------------------------------------- WhatsApp

const TEXTO_STATUS: Record<string, string> = {
  pendente: 'foi recebido e está aguardando a minha confirmação',
  confirmado: 'está confirmado',
  cancelado_salao: 'precisou ser cancelado',
  cancelado_cliente: 'foi cancelado a seu pedido',
  concluido: 'foi concluído, obrigada pela visita',
  falta: 'não foi realizado',
}

export function linkWhatsApp(a: AgendamentoPainel, timeZone: string): string {
  const { data, hora } = formatarNoFuso(a.inicio, timeZone)
  const texto = `Olá, ${a.cliente.nome}! Seu horário de ${a.servico.nome} em ${data} às ${hora} ${TEXTO_STATUS[a.status] ?? 'foi atualizado'}.`
  return `https://wa.me/${a.cliente.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
}

// ---------------------------------------------------------------- sessão

export function useSessao() {
  const sessao = useState<Sessao | null>('sessao', () => null)
  const carregada = useState<boolean>('sessao-carregada', () => false)
  const { request } = useApi()

  async function carregar(forcar = false): Promise<Sessao | null> {
    if (carregada.value && !forcar) return sessao.value
    try {
      sessao.value = await request<Sessao>('/auth/me/')
    }
    catch (e) {
      const status = (e as ApiError).status
      if (status === 401 || status === 403) sessao.value = null
      else throw e
    }
    carregada.value = true
    return sessao.value
  }

  async function entrar(username: string, password: string) {
    await request('/auth/csrf/')
    sessao.value = await request<Sessao>('/auth/login/', { method: 'POST', body: { username, password } })
    carregada.value = true
  }

  async function sair() {
    try {
      await request('/auth/logout/', { method: 'POST' })
    }
    finally {
      sessao.value = null
      carregada.value = true
    }
  }

  function expirou() {
    sessao.value = null
    carregada.value = true
    return navigateTo('/entrar')
  }

  return { sessao, carregar, entrar, sair, expirou }
}

// ---------------------------------------------------------------- API do painel

export function usePainelApi() {
  const { request } = useApi()
  const crud = <T>(recurso: string) => ({
    listar: (query?: Record<string, unknown>) => request<T[]>(`/painel/${recurso}/`, { query }),
    criar: (corpo: Record<string, unknown>) => request<T>(`/painel/${recurso}/`, { method: 'POST', body: corpo }),
    editar: (id: number, corpo: Record<string, unknown>) =>
      request<T>(`/painel/${recurso}/${id}/`, { method: 'PATCH', body: corpo }),
    apagar: (id: number) => request<void>(`/painel/${recurso}/${id}/`, { method: 'DELETE' }),
  })
  return {
    servicos: crud<ServicoPainel>('servicos'),
    clientes: {
      ...crud<ClientePainel>('clientes'),
      // simular=true nunca grava; false cria só os novos (máx. 300 por requisição)
      importar: (contatos: ContatoImportar[], simular: boolean) =>
        request<RespostaImportacao>('/painel/clientes/importar/', { method: 'POST', body: { contatos, simular } }),
    },
    horarios: crud<HorarioTrabalho>('horarios-trabalho'),
    bloqueios: crud<Bloqueio>('bloqueios'),
    agendamentos: {
      ...crud<AgendamentoPainel>('agendamentos'),
      acao: (id: number, acao: string, corpo: Record<string, unknown> = {}) =>
        request<AgendamentoPainel>(`/painel/agendamentos/${id}/${acao}/`, { method: 'POST', body: corpo }),
    },
    configuracao: {
      obter: () => request<Configuracao>('/painel/configuracao/'),
      editar: (corpo: Record<string, unknown>) =>
        request<Configuracao>('/painel/configuracao/', { method: 'PATCH', body: corpo }),
    },
  }
}

/** Fuso da profissional, compartilhado entre as telas do painel (carregado em /painel). */
export function useConfiguracao() {
  const configuracao = useState<Configuracao | null>('configuracao', () => null)
  const fuso = computed(() => configuracao.value?.timezone ?? 'America/Sao_Paulo')
  return { configuracao, fuso }
}

// ---------------------------------------------------------------- envio com tratamento de erros

/**
 * Executa uma chamada tratando {code,message,fields}: guarda os erros por campo e a mensagem geral,
 * impede envio duplo e redireciona ao login se a sessão expirou. Nunca limpa o que o usuário digitou.
 */
export function useEnvio() {
  const enviando = ref(false)
  const erro = ref('')
  const erros = ref<Record<string, string[]>>({})
  const { expirou } = useSessao()

  async function executar<T>(fn: () => Promise<T>, opcoes: { concorrente?: boolean } = {}): Promise<T | undefined> {
    if (enviando.value && !opcoes.concorrente) return undefined
    enviando.value = true
    erro.value = ''
    erros.value = {}
    try {
      return await fn()
    }
    catch (e) {
      const err = e as ApiError
      // O DRF responde 403 (não 401) com code nao_autenticado quando a sessão expira.
      if (err.status === 401 && err.code !== 'credenciais_invalidas' || err.code === 'nao_autenticado') {
        await expirou()
        return undefined
      }
      erros.value = err.fields ?? {}
      const gerais = err.fields?.non_field_errors?.join(' ')
      erro.value = gerais || mensagemErro(err)
      return undefined
    }
    finally {
      enviando.value = false
    }
  }

  function limpar() {
    erro.value = ''
    erros.value = {}
  }

  async function focarPrimeiroErro(ids: string[]) {
    await nextTick()
    const primeiro = ids.find(id => erros.value[id])
    if (primeiro) document.getElementById(`campo-${primeiro}`)?.focus()
  }

  return { enviando, erro, erros, executar, limpar, focarPrimeiroErro }
}

// ---------------------------------------------------------------- link público de agendamento

export function useLinkPublico() {
  const { sessao } = useSessao()
  const origem = useRequestURL().origin
  const slug = computed(() => sessao.value?.profissional?.slug ?? '')
  const caminho = computed(() => `/p/${encodeURIComponent(slug.value)}`)
  const link = computed(() => `${origem}${caminho.value}`)
  const copiado = ref(false)
  // navigator.share só existe em alguns navegadores/dispositivos: o botão só aparece se houver.
  const podeCompartilhar = ref(false)
  onMounted(() => {
    podeCompartilhar.value = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  })

  let relogio: ReturnType<typeof setTimeout> | undefined
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link.value)
      copiado.value = true
      clearTimeout(relogio)
      relogio = setTimeout(() => (copiado.value = false), 3000)
    }
    catch {
      copiado.value = false
    }
  }

  async function compartilhar() {
    try {
      await navigator.share({ title: 'Bela Agenda', text: 'Agende seu horário:', url: link.value })
    }
    catch { /* cancelado pelo usuário */ }
  }

  return { link, caminho, copiado, copiar, podeCompartilhar, compartilhar }
}
