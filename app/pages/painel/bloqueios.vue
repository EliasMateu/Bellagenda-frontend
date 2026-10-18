<script setup lang="ts">
import type { Bloqueio } from '~/composables/usePainel'

const api = usePainelApi()
const { fuso } = useConfiguracao()
const carga = useEnvio()
const lista = useEnvio()
const envio = useEnvio()

const bloqueios = ref<Bloqueio[]>([])
const carregou = ref(false)
const editando = ref<number | 'novo' | null>(null)
const apagando = ref<number | null>(null)
const form = reactive({ inicio: '', fim: '', motivo: '' })

type Quando = 'proximos' | 'passados'
const quando = ref<Quando>('proximos')
const visiveis = computed(() => {
  const agora = Date.now()
  const ordenados = [...bloqueios.value].sort((a, b) => a.inicio.localeCompare(b.inicio))
  return quando.value === 'proximos'
    ? ordenados.filter(b => new Date(b.fim).getTime() >= agora)
    : ordenados.filter(b => new Date(b.fim).getTime() < agora).reverse()
})

const folha = computed({
  get: () => editando.value !== null,
  set: (v: boolean) => {
    if (!v) editando.value = null
  },
})

async function carregar() {
  const r = await carga.executar(() => api.bloqueios.listar())
  if (r) bloqueios.value = r
  carregou.value = true
}

function abrir(b?: Bloqueio) {
  envio.limpar()
  editando.value = b ? b.id : 'novo'
  form.inicio = b ? paraLocal(b.inicio, fuso.value) : ''
  form.fim = b ? paraLocal(b.fim, fuso.value) : ''
  form.motivo = b?.motivo ?? ''
}

async function salvar() {
  const corpo = {
    inicio: isoNoFuso(form.inicio, fuso.value),
    fim: isoNoFuso(form.fim, fuso.value),
    motivo: form.motivo.trim(),
  }
  const id = editando.value
  const r = await envio.executar(() => (typeof id === 'number' ? api.bloqueios.editar(id, corpo) : api.bloqueios.criar(corpo)))
  if (r) {
    editando.value = null
    await carregar()
  }
  else {
    await envio.focarPrimeiroErro(['inicio', 'fim', 'motivo'])
  }
}

async function apagar(id: number) {
  const r = await lista.executar(async () => {
    await api.bloqueios.apagar(id)
    return true
  })
  apagando.value = null
  if (r) bloqueios.value = bloqueios.value.filter(b => b.id !== id)
}

const diaMes = (ymd: string) => {
  const [, d = '', m = ''] = formatarDataCurta(ymd).split(' ')
  return { d, m }
}
// Mesmo dia: "20 out, 14:00 – 16:00"; dias seguidos inteiros: "20 – 22 out"; senão datas e horas completas.
function periodo(b: Bloqueio) {
  const [d1 = '', h1 = ''] = paraLocal(b.inicio, fuso.value).split('T')
  const [d2 = '', h2 = ''] = paraLocal(b.fim, fuso.value).split('T')
  const a = diaMes(d1)
  const z = diaMes(d2)
  if (d1 === d2) return `${a.d} ${a.m}, ${h1} – ${h2}`
  if (h1 === '00:00' && (h2 === '23:59' || h2 === '00:00')) {
    return a.m === z.m ? `${a.d} – ${z.d} ${z.m}` : `${a.d} ${a.m} – ${z.d} ${z.m}`
  }
  return `${a.d} ${a.m}, ${h1} – ${z.d} ${z.m}, ${h2}`
}

const menuDe = [{ id: 'remover', label: 'Remover', danger: true }]

onMounted(carregar)
</script>

<template>
  <section class="gestao">
    <GestaoCabecalho titulo="Bloqueios" acao="Novo bloqueio" @acao="abrir()" />
    <p class="ajuda">Períodos em que você não atende (folgas, férias, compromissos). Horários no fuso {{ fuso }}.</p>

    <div v-if="bloqueios.length" class="segmentado" role="group" aria-label="Período dos bloqueios">
      <button type="button" :aria-pressed="quando === 'proximos'" @click="quando = 'proximos'">Próximos</button>
      <button type="button" :aria-pressed="quando === 'passados'" @click="quando = 'passados'">Passados</button>
    </div>

    <AvisoErro v-if="lista.erro.value" :mensagem="lista.erro.value" />

    <div v-if="!carregou && !carga.erro.value" role="status" class="esqueletos">
      <p class="somente-leitor">Carregando…</p>
      <div v-for="n in 3" :key="n" class="esqueleto esqueleto-cartao" aria-hidden="true" />
    </div>

    <div v-else-if="carga.erro.value && !bloqueios.length" class="estado-erro">
      <AvisoErro :mensagem="carga.erro.value" />
      <p><button type="button" class="btn-secundario" @click="carregar">Tentar de novo</button></p>
    </div>

    <UiEmpty
      v-else-if="!bloqueios.length" icone="calendario" titulo="Nenhum bloqueio"
      texto="Bloqueie folgas, férias ou compromissos para não receber agendamentos nesses períodos."
      acao="Novo bloqueio" @acao="abrir()"
    />

    <p v-else-if="!visiveis.length" class="vazio">
      {{ quando === 'proximos' ? 'Nenhum bloqueio próximo.' : 'Nenhum bloqueio passado.' }}
    </p>

    <ul v-else class="grade-gestao">
      <CartaoItem
        v-for="b in visiveis" :key="b.id" acao-rotulo="Editar" :menu="menuDe"
        @acao="abrir(b)" @menu="apagando = b.id"
      >
        <h3 class="cg-nome">{{ periodo(b) }}</h3>
        <p class="cg-sec">{{ b.motivo || 'Sem motivo informado' }}</p>
        <template #extra>
          <ConfirmarAcao
            v-if="apagando === b.id" pergunta="Remover este bloqueio?" rotulo="Sim, remover"
            :enviando="lista.enviando.value" @voltar="apagando = null" @confirmar="apagar(b.id)"
          />
        </template>
      </CartaoItem>
    </ul>

    <UiSheet v-model="folha" :titulo="editando === 'novo' ? 'Novo bloqueio' : 'Editar bloqueio'">
      <form @submit.prevent="salvar">
        <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
        <CampoForm id="inicio" v-model="form.inicio" tipo="datetime-local" label="Início" :hoje="hojeNoFuso(fuso)" :erros="envio.erros.value.inicio" />
        <CampoForm id="fim" v-model="form.fim" tipo="datetime-local" label="Fim" :hoje="hojeNoFuso(fuso)" :erros="envio.erros.value.fim" />
        <CampoForm id="motivo" v-model="form.motivo" label="Motivo (opcional)" maxlength="200" :erros="envio.erros.value.motivo" />
        <p class="acoes acoes-folha">
          <button type="button" class="btn-secundario" :disabled="envio.enviando.value" @click="editando = null">Cancelar</button>
          <button type="submit" :disabled="envio.enviando.value" :aria-busy="envio.enviando.value || undefined">
            {{ envio.enviando.value ? 'Salvando…' : 'Salvar' }}
          </button>
        </p>
      </form>
    </UiSheet>
  </section>
</template>
