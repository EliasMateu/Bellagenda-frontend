<script setup lang="ts">
import type { AgendamentoConsultado } from '~/composables/usePublico'
import type { ApiError } from '~/composables/useApi'

const slug = String(useRoute().params.slug)
const api = usePublico(slug)
const locais = useAgendamentosLocais(slug)
const origem = useRequestURL().origin

// O token fica só em memória (nunca em query string nem console); o fragmento é removido da URL ao ler.
const token = ref('')
const agendamento = ref<AgendamentoConsultado | null>(null)
const estado = ref<'carregando' | 'ok' | 'vazio' | 'erro'>('carregando')
const erro = ref('')
const novo = ref(false)
const confirmando = ref(false)
const cancelando = ref(false)
const copiado = ref(false)
const podeCompartilhar = ref(false)
const titulo = ref<HTMLElement | null>(null)
const tituloConfirmacao = ref<HTMLElement | null>(null)

function tratarErro(e: ApiError) {
  switch (e.code) {
    case 'nao_encontrado':
      erro.value = 'Agendamento não encontrado.'
      break
    case 'fora_do_prazo':
      erro.value = 'O prazo para cancelar este agendamento já passou.'
      break
    case 'nao_cancelavel':
      erro.value = 'Este agendamento não pode mais ser cancelado.'
      break
    default:
      erro.value = mensagemErro(e)
  }
}

/** Consulta um token. Retorna true se a tela foi resolvida (sucesso ou erro exibido). */
async function carregarToken(t: string, explicito: boolean): Promise<boolean> {
  try {
    agendamento.value = await api.consultar({ token: t })
    token.value = t
    estado.value = 'ok'
    locais.adicionar(t)
    await nextTick()
    titulo.value?.focus()
    return true
  }
  catch (e) {
    const err = e as ApiError
    if (err.status === 404) locais.remover(t)
    if (explicito || err.status !== 404) {
      tratarErro(err)
      estado.value = 'erro'
      return true
    }
    return false
  }
}

onMounted(async () => {
  podeCompartilhar.value = typeof navigator.share === 'function'
  const params = new URLSearchParams(window.location.hash.slice(1))
  const doLink = params.get('token')
  novo.value = params.get('novo') === '1'
  if (doLink) {
    // Remove o fragmento (token e novo=1) da URL/histórico antes de qualquer outra coisa.
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    await carregarToken(doLink, true)
    return
  }
  for (const g of locais.ler()) {
    if (await carregarToken(g.token, false)) return
  }
  estado.value = 'vazio'
  await nextTick()
  titulo.value?.focus()
})

// ---------------------------------------------------------------- dados de exibição

const ag = computed(() => agendamento.value)
const status = computed(() => ag.value?.status ?? '')
const primeiroNome = computed(() => ag.value?.profissional.split(' ')[0] ?? '')
const ymd = computed(() => ag.value?.inicio.slice(0, 10) ?? '')
const horaInicio = computed(() => (ag.value ? formatarIso(ag.value.inicio).hora : ''))
const horaFim = computed(() => (ag.value ? formatarIso(ag.value.fim).hora : ''))
const ativo = computed(() => status.value === 'pendente' || status.value === 'confirmado')
const contagem = computed(() => (ag.value && ativo.value ? contagemRelativa(ag.value.inicio) : null))

const HERO: Record<string, { titulo: string, texto: (p: string) => string }> = {
  pendente: { titulo: 'Solicitação enviada', texto: p => `Aguardando a confirmação de ${p}.` },
  confirmado: { titulo: 'Agendamento confirmado', texto: () => 'Tudo certo! Esperamos você.' },
  concluido: { titulo: 'Atendimento concluído', texto: () => 'Obrigada pela visita!' },
  falta: { titulo: 'Atendimento não realizado', texto: () => 'Este horário foi marcado como falta.' },
  cancelado_cliente: { titulo: 'Agendamento cancelado', texto: () => 'Você cancelou este agendamento.' },
  cancelado_salao: { titulo: 'Agendamento cancelado', texto: p => `${p} precisou cancelar este horário.` },
}
const hero = computed(() => HERO[status.value] ?? { titulo: 'Seu agendamento', texto: () => '' })
const tom = computed(() =>
  status.value === 'pendente' ? 'aviso' : (status.value === 'confirmado' || status.value === 'concluido') ? 'sucesso' : 'erro',
)
const animarCheck = computed(() => novo.value && status.value !== 'pendente')

// Linha do tempo: Solicitado -> Confirmado -> Concluído; cancelado/faltou entra como etapa final em vermelho.
const etapas = computed(() => {
  const s = status.value
  if (s === 'falta' || s.startsWith('cancelado')) {
    return [
      { rotulo: 'Solicitado', estado: 'feito' },
      { rotulo: s === 'falta' ? 'Faltou' : 'Cancelado', estado: 'erro' },
    ]
  }
  const atual = ({ pendente: 0, confirmado: 1, concluido: 2 } as Record<string, number>)[s] ?? 0
  return ['Solicitado', 'Confirmado', 'Concluído'].map((rotulo, i) => ({
    rotulo,
    estado: i < atual || s === 'concluido' ? 'feito' : i === atual ? 'atual' : 'futuro',
  }))
})
const progresso = computed(() => {
  const n = etapas.value.length
  const ultimo = etapas.value.reduce((u, e, i) => (e.estado !== 'futuro' ? i : u), 0)
  const concluido = status.value === 'concluido'
  const idx = etapas.value[ultimo]?.estado === 'atual' ? ultimo : ultimo
  return `${Math.round(((concluido ? n - 1 : idx) / (n - 1)) * 100)}%`
})

// ---------------------------------------------------------------- ações

const linkGestao = computed(() => `${origem}/p/${encodeURIComponent(slug)}/meu-agendamento#token=${encodeURIComponent(token.value)}`)

const whatsapp = computed(() => {
  const tel = ag.value?.profissional_telefone?.replace(/\D/g, '')
  if (!tel || !ag.value) return null
  const texto = `Olá! Sobre meu agendamento de ${ag.value.servico.nome} em ${formatarIso(ag.value.inicio).data} às ${horaInicio.value}.`
  return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
})

function baixarCalendario() {
  if (!ag.value) return
  const ics = gerarIcs({
    uid: `${ag.value.codigo}-${ag.value.inicio}@bela-agenda`,
    inicio: ag.value.inicio,
    fim: ag.value.fim,
    resumo: `${ag.value.servico.nome} - ${ag.value.profissional}`,
    descricao: `Agendamento de ${ag.value.servico.nome} com ${ag.value.profissional}.`,
  })
  baixarArquivo('agendamento.ics', ics, 'text/calendar;charset=utf-8')
}

let relogioCopia: ReturnType<typeof setTimeout> | undefined
async function copiar() {
  try {
    await navigator.clipboard.writeText(linkGestao.value)
    copiado.value = true
    clearTimeout(relogioCopia)
    relogioCopia = setTimeout(() => (copiado.value = false), 3000)
  }
  catch {
    copiado.value = false
  }
}

async function compartilhar() {
  try {
    await navigator.share({ title: 'Meu agendamento', url: linkGestao.value })
  }
  catch { /* cancelado pelo usuário */ }
}

function pedirConfirmacao() {
  confirmando.value = true
  nextTick(() => tituloConfirmacao.value?.focus())
}

async function cancelar() {
  if (cancelando.value || !token.value) return
  cancelando.value = true
  erro.value = ''
  try {
    await api.cancelar({ token: token.value })
    locais.remover(token.value)
    confirmando.value = false
    if (agendamento.value) agendamento.value.status = 'cancelado_cliente'
    nextTick(() => titulo.value?.focus())
  }
  catch (e) {
    confirmando.value = false
    tratarErro(e as ApiError)
  }
  finally {
    cancelando.value = false
  }
}
</script>

<template>
  <main class="pagina-publica detalhes">
    <p class="det-voltar">
      <a :href="`/p/${encodeURIComponent(slug)}`"><UiIcon nome="chevron-esquerda" :tamanho="20" /> Voltar ao agendamento</a>
    </p>

    <!-- carregando -->
    <div v-if="estado === 'carregando'" role="status" class="det-esqueleto">
      <p class="somente-leitor">Carregando…</p>
      <div class="esqueleto esqueleto-hero" aria-hidden="true" />
      <div class="esqueleto esqueleto-cartao" aria-hidden="true" />
      <div class="esqueleto esqueleto-cartao" aria-hidden="true" />
    </div>

    <!-- sem token neste aparelho -->
    <section v-else-if="estado === 'vazio'" class="cartao det-vazio">
      <UiIcon nome="agenda-relogio" :tamanho="56" class="icone-vazio" />
      <h1 ref="titulo" tabindex="-1">Não encontramos seu agendamento neste aparelho</h1>
      <p>Abra o link que você recebeu ou faça um novo agendamento.</p>
      <a :href="`/p/${encodeURIComponent(slug)}`" class="btn btn-primario">Agendar</a>
    </section>

    <!-- erro (ex.: 404 do link) -->
    <section v-else-if="estado === 'erro'" class="cartao det-vazio">
      <h1 ref="titulo" tabindex="-1">Não foi possível abrir o agendamento</h1>
      <AvisoErro v-if="erro" :mensagem="erro" />
      <a :href="`/p/${encodeURIComponent(slug)}`" class="btn btn-primario">Agendar</a>
    </section>

    <template v-else-if="ag">
      <AvisoErro v-if="erro" :mensagem="erro" />

      <!-- hero -->
      <section class="hero bloco" :data-status="status" :data-tom="tom" :class="{ animar: animarCheck }">
        <div class="hero-selo" :data-tom="tom">
          <svg v-if="status === 'confirmado' || status === 'concluido'" class="hero-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path class="hero-check" d="M5 12.5l4.5 4.5L19 7.5" pathLength="100" />
          </svg>
          <UiIcon v-else-if="status === 'pendente'" nome="relogio" :tamanho="36" class="hero-icone" />
          <UiIcon v-else nome="fechar" :tamanho="36" class="hero-icone" />
        </div>
        <h1 ref="titulo" tabindex="-1">{{ hero.titulo }}</h1>
        <p class="hero-texto">{{ hero.texto(ag.profissional) }}</p>
        <p v-if="contagem" class="hero-contagem"><UiIcon nome="calendario" :tamanho="18" /> {{ contagem }}</p>
      </section>

      <!-- detalhes -->
      <section class="cartao bloco" aria-label="Detalhes do atendimento">
        <dl class="det-lista">
          <div class="det-item">
            <UiIcon nome="calendario" />
            <dt>Data</dt>
            <dd>{{ formatarDataExtenso(ymd) }}</dd>
          </div>
          <div class="det-item">
            <UiIcon nome="relogio" />
            <dt>Horário</dt>
            <dd>{{ horaInicio }} – {{ horaFim }}</dd>
          </div>
          <div class="det-item">
            <UiIcon nome="servicos" />
            <dt>Serviço</dt>
            <dd>{{ ag.servico.nome }} · {{ formatarDuracao(ag.servico.duracao_min) }}</dd>
          </div>
          <div class="det-item">
            <UiIcon nome="etiqueta" />
            <dt>Preço</dt>
            <dd>{{ formatarPreco(ag.preco) }}</dd>
          </div>
          <div class="det-item">
            <UiIcon nome="usuario" />
            <dt>Profissional</dt>
            <dd>{{ ag.profissional }}</dd>
          </div>
        </dl>
      </section>

      <!-- linha do tempo -->
      <section class="cartao bloco" aria-label="Andamento">
        <div class="timeline" :style="{ '--progresso': progresso }" :class="{ erro: etapas.some(e => e.estado === 'erro') }">
          <div class="timeline-trilho" aria-hidden="true"><div class="timeline-fill" /></div>
          <ol :style="{ gridTemplateColumns: `repeat(${etapas.length}, 1fr)` }">
            <li
              v-for="e in etapas" :key="e.rotulo" :data-estado="e.estado"
              :aria-current="e.estado === 'atual' ? 'step' : undefined"
            >
              <span class="timeline-marca" aria-hidden="true" />
              <span class="timeline-rotulo">{{ e.rotulo }}</span>
            </li>
          </ol>
        </div>
      </section>

      <!-- ações -->
      <section class="det-acoes bloco" aria-label="Ações">
        <button v-if="ativo" type="button" class="btn-primario btn-grande" @click="baixarCalendario">
          <UiIcon nome="calendario-check" :tamanho="22" /> Adicionar ao calendário
        </button>
        <a v-if="whatsapp" :href="whatsapp" class="btn btn-grande" target="_blank" rel="noopener noreferrer">
          <UiIcon nome="whatsapp" :tamanho="22" /> Falar com {{ primeiroNome }} no WhatsApp
        </a>
        <button type="button" class="btn-secundario btn-grande" @click="copiar">
          <UiIcon :nome="copiado ? 'check' : 'copiar'" :tamanho="22" /> {{ copiado ? 'Copiado' : 'Copiar link' }}
        </button>
        <button v-if="podeCompartilhar" type="button" class="btn-secundario btn-grande" @click="compartilhar">
          <UiIcon nome="compartilhar" :tamanho="22" /> Compartilhar
        </button>
        <p class="somente-leitor" role="status" aria-live="polite">{{ copiado ? 'Link copiado.' : '' }}</p>

        <template v-if="ativo">
          <div v-if="confirmando" class="confirmacao" role="group" aria-labelledby="titulo-confirmacao">
            <h2 id="titulo-confirmacao" ref="tituloConfirmacao" tabindex="-1">Cancelar este agendamento?</h2>
            <p>Esta ação não pode ser desfeita.</p>
            <p>
              <button type="button" class="btn-secundario" :disabled="cancelando" @click="confirmando = false">Voltar</button>
              <button type="button" class="btn-perigo" :disabled="cancelando" :aria-busy="cancelando || undefined" @click="cancelar">
                Sim, cancelar agendamento
              </button>
            </p>
          </div>
          <template v-else>
            <button
              type="button" class="btn-perigo btn-grande" :disabled="!ag.pode_cancelar" @click="pedirConfirmacao"
            >
              Cancelar agendamento
            </button>
            <p v-if="!ag.pode_cancelar" class="ajuda">
              O prazo para cancelar já passou. Fale com {{ primeiroNome }} para resolver.
            </p>
            <p v-else class="ajuda">
              Cancelamento permitido até {{ formatarIso(ag.cancelamento_ate).data }} às {{ formatarIso(ag.cancelamento_ate).hora }}.
            </p>
          </template>
          <p class="ajuda aviso-remarcar">Para remarcar, fale com {{ primeiroNome }}.</p>
        </template>
      </section>
    </template>
  </main>
</template>
