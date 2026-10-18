<script setup lang="ts">
import type { HorarioTrabalho } from '~/composables/usePainel'

const api = usePainelApi()
const { fuso } = useConfiguracao()
const carga = useEnvio()
const lista = useEnvio()
const envio = useEnvio()

const horarios = ref<HorarioTrabalho[]>([])
const carregou = ref(false)
const editando = ref<number | 'novo' | null>(null)
const apagando = ref<number | null>(null)
const opcoesDias = DIAS_SEMANA.map((nome, i) => ({ value: i, label: nome }))
const form = reactive({ dia_semana: 0 as string | number, inicio: '09:00', fim: '18:00' })

// dia_semana: 0 = segunda ... 6 = domingo; diaDaSemana(): 0 = domingo.
const diaHoje = computed(() => (diaDaSemana(hojeNoFuso(fuso.value)) + 6) % 7)

const porDia = computed(() =>
  DIAS_SEMANA.map((nome, dia) => ({ nome, dia, faixas: horarios.value.filter(h => h.dia_semana === dia) })),
)

const folha = computed({
  get: () => editando.value !== null,
  set: (v: boolean) => {
    if (!v) {
      editando.value = null
      apagando.value = null
    }
  },
})

async function carregar() {
  const r = await carga.executar(() => api.horarios.listar())
  if (r) horarios.value = r
  carregou.value = true
}

function abrir(h?: HorarioTrabalho, dia?: number) {
  envio.limpar()
  apagando.value = null
  editando.value = h ? h.id : 'novo'
  form.dia_semana = h?.dia_semana ?? dia ?? 0
  form.inicio = h?.inicio.slice(0, 5) ?? '09:00'
  form.fim = h?.fim.slice(0, 5) ?? '18:00'
}

async function salvar() {
  const corpo = { dia_semana: Number(form.dia_semana), inicio: form.inicio, fim: form.fim }
  const id = editando.value
  const r = await envio.executar(() => (typeof id === 'number' ? api.horarios.editar(id, corpo) : api.horarios.criar(corpo)))
  if (r) {
    editando.value = null
    await carregar()
  }
  else {
    await envio.focarPrimeiroErro(['dia_semana', 'inicio', 'fim'])
  }
}

async function apagar(id: number) {
  const r = await lista.executar(async () => {
    await api.horarios.apagar(id)
    return true
  })
  apagando.value = null
  if (r) {
    horarios.value = horarios.value.filter(h => h.id !== id)
    editando.value = null
  }
}

onMounted(carregar)
</script>

<template>
  <section class="gestao">
    <GestaoCabecalho titulo="Horários de trabalho" acao="Nova faixa" @acao="abrir()" />
    <AvisoErro v-if="lista.erro.value" :mensagem="lista.erro.value" />

    <div v-if="!carregou && !carga.erro.value" role="status" class="esqueletos">
      <p class="somente-leitor">Carregando…</p>
      <div v-for="n in 3" :key="n" class="esqueleto esqueleto-cartao" aria-hidden="true" />
    </div>

    <div v-else-if="carga.erro.value && !horarios.length" class="estado-erro">
      <AvisoErro :mensagem="carga.erro.value" />
      <p><button type="button" class="btn-secundario" @click="carregar">Tentar de novo</button></p>
    </div>

    <ul v-else class="grade-gestao">
      <li v-for="d in porDia" :key="d.dia" class="cartao-gestao" :class="{ 'dia-hoje': d.dia === diaHoje }">
        <div class="cg-cab">
          <div class="cg-texto"><h3 class="cg-nome">{{ d.nome }}</h3></div>
          <div v-if="d.dia === diaHoje" class="cg-selo"><span class="distintivo-status" data-status="hoje">Hoje</span></div>
        </div>
        <div class="faixas">
          <button
            v-for="h in d.faixas" :key="h.id" type="button" class="chip-faixa"
            :aria-label="`Editar faixa de ${h.inicio.slice(0, 5)} às ${h.fim.slice(0, 5)}`" @click="abrir(h)"
          >
            {{ h.inicio.slice(0, 5) }} – {{ h.fim.slice(0, 5) }}
          </button>
          <p v-if="!d.faixas.length" class="fechado">Fechado</p>
        </div>
        <div class="cg-acoes">
          <button type="button" class="btn-secundario" @click="abrir(undefined, d.dia)">
            <UiIcon nome="mais" :tamanho="20" /> Faixa
          </button>
        </div>
      </li>
    </ul>

    <UiSheet v-model="folha" :titulo="editando === 'novo' ? 'Nova faixa de horário' : 'Editar faixa de horário'">
      <form @submit.prevent="salvar">
        <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
        <CampoForm id="dia_semana" v-model="form.dia_semana" tipo="select" label="Dia da semana" :options="opcoesDias" :erros="envio.erros.value.dia_semana" />
        <CampoForm id="inicio" v-model="form.inicio" tipo="time" label="Início" :erros="envio.erros.value.inicio" />
        <CampoForm id="fim" v-model="form.fim" tipo="time" label="Fim" :erros="envio.erros.value.fim" />
        <ConfirmarAcao
          v-if="typeof editando === 'number' && apagando === editando" pergunta="Remover esta faixa de horário?"
          rotulo="Sim, remover" :enviando="lista.enviando.value" @voltar="apagando = null" @confirmar="apagar(editando)"
        />
        <p class="acoes acoes-folha">
          <button
            v-if="typeof editando === 'number'" type="button" class="btn-perigo" :disabled="envio.enviando.value"
            @click="apagando = editando"
          >
            Remover
          </button>
          <button type="button" class="btn-secundario" :disabled="envio.enviando.value" @click="editando = null">Cancelar</button>
          <button type="submit" :disabled="envio.enviando.value" :aria-busy="envio.enviando.value || undefined">
            {{ envio.enviando.value ? 'Salvando…' : 'Salvar' }}
          </button>
        </p>
      </form>
    </UiSheet>
  </section>
</template>
