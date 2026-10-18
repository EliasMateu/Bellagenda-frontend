<script setup lang="ts">
import type { AgendamentoPainel } from '~/composables/usePainel'

const api = usePainelApi()
const { fuso } = useConfiguracao()
const cargaLista = useEnvio()
const cargaMarcas = useEnvio()
const compartilhar = useLinkPublico()

type Modo = 'dia' | 'semana'

const FILTROS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'confirmado', rotulo: 'Confirmado' },
  { valor: 'concluido', rotulo: 'Concluído' },
  { valor: 'falta', rotulo: 'Faltou' },
  { valor: 'cancelado_cliente', rotulo: 'Cancelado pela cliente' },
  { valor: 'cancelado_salao', rotulo: 'Cancelado pelo salão' },
]

const modo = ref<Modo>('dia')
const dia = ref(hojeNoFuso(fuso.value))
const filtro = ref('')
const itens = ref<AgendamentoPainel[]>([])
const semana = ref<AgendamentoPainel[]>([])
const iniciou = ref(false)
const criando = ref(false)
const compartilhando = ref(false)
const pendentes = ref(0)

const hoje = computed(() => hojeNoFuso(fuso.value))
const domingo = computed(() => domingoDaSemana(dia.value))
const periodo = computed(() =>
  modo.value === 'dia'
    ? { de: dia.value, ate: dia.value }
    : { de: domingo.value, ate: somarDias(domingo.value, 6) },
)

const dm = (ymd: string) => {
  const [, d = '', mes = ''] = formatarDataCurta(ymd).split(' ')
  return { d, mes }
}
const textoPeriodo = computed(() => {
  if (modo.value === 'dia') {
    const [sem = '', d = '', mes = ''] = formatarDataCurta(dia.value).split(' ')
    return `${sem.replace(',', '').replace(/^./, c => c.toUpperCase())}, ${d} ${mes}`
  }
  const a = dm(periodo.value.de)
  const b = dm(periodo.value.ate)
  return a.mes === b.mes ? `${a.d} a ${b.d} ${b.mes}` : `${a.d} ${a.mes} a ${b.d} ${b.mes}`
})
const passo = computed(() => (modo.value === 'dia' ? 1 : 7))

let seqLista = 0
async function carregarLista() {
  const meu = ++seqLista
  pendentes.value++
  const lista = await cargaLista.executar(
    () => api.agendamentos.listar({ de: periodo.value.de, ate: periodo.value.ate, status: filtro.value || undefined }),
    { concorrente: true },
  )
  pendentes.value--
  if (meu !== seqLista) return
  if (lista) itens.value = lista
  iniciou.value = true
}

let seqMarcas = 0
async function carregarMarcas() {
  const meu = ++seqMarcas
  const lista = await cargaMarcas.executar(
    () => api.agendamentos.listar({ de: domingo.value, ate: somarDias(domingo.value, 6) }),
    { concorrente: true },
  )
  if (lista && meu === seqMarcas) semana.value = lista
}

const marcados = computed(() => [
  ...new Set(
    semana.value
      .filter(a => !a.status.startsWith('cancelado'))
      .map(a => paraLocal(a.inicio, fuso.value).slice(0, 10)),
  ),
])

const proximo = computed(() => {
  if (modo.value !== 'dia' || dia.value !== hoje.value) return null
  const agora = Date.now()
  return semana.value.find(a =>
    (a.status === 'pendente' || a.status === 'confirmado')
    && new Date(a.inicio).getTime() > agora
    && paraLocal(a.inicio, fuso.value).slice(0, 10) === dia.value,
  ) ?? null
})

const porDia = computed(() => {
  const grupos = new Map<string, AgendamentoPainel[]>()
  for (const a of itens.value) {
    const d = formatarNoFuso(a.inicio, fuso.value).data
    grupos.set(d, [...(grupos.get(d) ?? []), a])
  }
  return [...grupos.entries()]
})

const carregando = computed(() => !iniciou.value || (pendentes.value > 0 && !itens.value.length))
const filtroAtivo = computed(() => FILTROS.find(f => f.valor === filtro.value))

function mover(sinal: 1 | -1) {
  dia.value = somarDias(dia.value, sinal * passo.value)
}

function atualizado(novo: AgendamentoPainel) {
  itens.value = itens.value.map(a => (a.id === novo.id ? novo : a))
  void carregarLista()
  void carregarMarcas()
}

function criado(novo: AgendamentoPainel) {
  criando.value = false
  const alvo = paraLocal(novo.inicio, fuso.value).slice(0, 10)
  if (alvo < periodo.value.de || alvo > periodo.value.ate) dia.value = alvo
  else void carregarLista()
  void carregarMarcas()
}

watch([modo, () => periodo.value.de, () => periodo.value.ate, filtro], () => {
  itens.value = []
  void carregarLista()
})
watch(() => domingo.value, () => void carregarMarcas())
onMounted(() => {
  void carregarLista()
  void carregarMarcas()
})
</script>

<template>
  <section class="agenda">
    <div class="agenda-titulo">
      <h1>Agenda</h1>
      <button type="button" class="btn-secundario btn-compacto" @click="compartilhando = true">
        <UiIcon nome="compartilhar" :tamanho="20" /> Compartilhar
      </button>
    </div>

    <div class="segmentado" role="group" aria-label="Período">
      <button type="button" :aria-pressed="modo === 'dia'" @click="modo = 'dia'">Dia</button>
      <button type="button" :aria-pressed="modo === 'semana'" @click="modo = 'semana'">Semana</button>
    </div>

    <div class="agenda-periodo">
      <button type="button" class="btn-icone" :aria-label="modo === 'dia' ? 'Dia anterior' : 'Semana anterior'" @click="mover(-1)">
        <UiIcon nome="chevron-esquerda" />
      </button>
      <p class="periodo-texto" aria-live="polite">{{ textoPeriodo }}</p>
      <button type="button" class="btn-icone" :aria-label="modo === 'dia' ? 'Próximo dia' : 'Próxima semana'" @click="mover(1)">
        <UiIcon nome="chevron-direita" />
      </button>
      <UiDatePicker v-model="dia" variant="compacto" :today="hoje" label="Escolher data" aria-label="Escolher data" />
      <button
        type="button" class="btn-secundario btn-hoje" :disabled="dia === hoje" aria-label="Ir para hoje"
        title="Ir para hoje" @click="dia = hoje"
      >
        <UiIcon nome="calendario-check" :tamanho="20" /><span class="hoje-texto">Hoje</span>
      </button>
    </div>

    <UiWeekStrip v-if="modo === 'dia'" v-model="dia" :marked="marcados" :today="hoje" />

    <div class="filtros" role="group" aria-label="Filtrar por situação">
      <button
        v-for="f in FILTROS" :key="f.valor" type="button" class="filtro" :aria-pressed="filtro === f.valor"
        @click="filtro = f.valor"
      >
        {{ f.rotulo }}
      </button>
    </div>

    <button type="button" class="btn-primario btn-largo" @click="criando = true">
      <UiIcon nome="mais" /> Novo agendamento
    </button>

    <div v-if="proximo" class="proximo cartao">
      <UiIcon nome="relogio" />
      <p>
        <strong>Próximo atendimento:</strong>
        {{ formatarNoFuso(proximo.inicio, fuso).hora }} · {{ proximo.cliente.nome }} · {{ proximo.servico.nome }}
      </p>
    </div>

    <div :key="`${modo}-${periodo.de}-${filtro}`" class="lista-periodo">
      <div v-if="carregando" role="status" class="esqueletos">
        <p class="somente-leitor">Carregando…</p>
        <div v-for="n in 3" :key="n" class="esqueleto esqueleto-cartao" aria-hidden="true" />
      </div>

      <div v-else-if="cargaLista.erro.value && !itens.length" class="estado-erro">
        <AvisoErro :mensagem="cargaLista.erro.value" />
        <p><button type="button" class="btn-secundario" @click="carregarLista">Tentar de novo</button></p>
      </div>

      <div v-else-if="!itens.length" class="estado-vazio">
        <UiIcon nome="agenda-vazia" :tamanho="40" />
        <template v-if="filtroAtivo?.valor">
          <h2>Nenhum atendimento nesta situação</h2>
          <p>Não há atendimentos “{{ filtroAtivo.rotulo }}” {{ modo === 'dia' ? 'neste dia' : 'nesta semana' }}.</p>
        </template>
        <template v-else>
          <h2>{{ modo === 'dia' ? 'Seu dia está livre' : 'Sua semana está livre' }}</h2>
          <p>Nenhum atendimento por aqui. Aproveite ou registre um novo.</p>
        </template>
      </div>

      <template v-else>
        <section v-for="[dia_, lista] in porDia" :key="dia_">
          <h2 v-if="modo === 'semana'" class="titulo-dia">{{ dia_ }}</h2>
          <ul>
            <AgendamentoItem v-for="a in lista" :key="a.id" :agendamento="a" :fuso="fuso" @atualizado="atualizado" />
          </ul>
        </section>
      </template>
    </div>

    <UiSheet v-model="criando" titulo="Novo agendamento no balcão">
      <FormAgendamentoManual :fuso="fuso" @criado="criado" @fechar="criando = false" />
    </UiSheet>

    <UiSheet v-model="compartilhando" titulo="Link de agendamento">
      <p>Envie este link para suas clientes agendarem sozinhas.</p>
      <p class="campo">
        <label for="link-compartilhar">Link</label>
        <input id="link-compartilhar" type="text" readonly :value="compartilhar.link.value" data-autofocus>
      </p>
      <p class="acoes">
        <button type="button" class="btn-primario" @click="compartilhar.copiar">
          <UiIcon :nome="compartilhar.copiado.value ? 'check' : 'copiar'" :tamanho="20" />
          {{ compartilhar.copiado.value ? 'Copiado' : 'Copiar' }}
        </button>
        <button v-if="compartilhar.podeCompartilhar.value" type="button" class="btn-secundario" @click="compartilhar.compartilhar">
          <UiIcon nome="compartilhar" :tamanho="20" /> Compartilhar
        </button>
        <a :href="compartilhar.caminho.value" class="btn" target="_blank" rel="noopener">Abrir</a>
      </p>
      <p class="somente-leitor" role="status" aria-live="polite">{{ compartilhar.copiado.value ? 'Link copiado.' : '' }}</p>
    </UiSheet>
  </section>
</template>
