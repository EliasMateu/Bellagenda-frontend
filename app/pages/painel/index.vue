<script setup lang="ts">
import type { AgendamentoPainel } from '~/composables/usePainel'

const api = usePainelApi()
const { fuso } = useConfiguracao()
const carga = useEnvio()

const data = ref(hojeNoFuso(fuso.value))
const filtro = ref('')
const itens = ref<AgendamentoPainel[]>([])
const criando = ref(false)

const segunda = computed(() => segundaDaSemana(data.value))
const domingo = computed(() => somarDias(segunda.value, 6))

async function carregar() {
  const lista = await carga.executar(() =>
    api.agendamentos.listar({ de: segunda.value, ate: domingo.value, status: filtro.value || undefined }),
  )
  if (lista) itens.value = lista
}

const porDia = computed(() => {
  const grupos = new Map<string, AgendamentoPainel[]>()
  for (const a of itens.value) {
    const d = formatarNoFuso(a.inicio, fuso.value).data
    grupos.set(d, [...(grupos.get(d) ?? []), a])
  }
  return [...grupos.entries()]
})

function atualizado(novo: AgendamentoPainel) {
  itens.value = itens.value.map(a => (a.id === novo.id ? novo : a))
  // remarcar pode mover o item para fora da semana exibida
  const dia = paraLocal(novo.inicio, fuso.value).slice(0, 10)
  if (dia < segunda.value || dia > domingo.value) void carregar()
}

function criado(novo: AgendamentoPainel) {
  criando.value = false
  const dia = paraLocal(novo.inicio, fuso.value).slice(0, 10)
  if (dia === data.value) void carregar()
  else data.value = dia
}

watch([data, filtro], carregar)
onMounted(carregar)
</script>

<template>
  <section>
    <h1>Agenda</h1>
    <form @submit.prevent="carregar">
      <p class="seletor-data">
        <button type="button" @click="data = somarDias(data, -7)">Semana anterior</button>
        <label for="campo-data">Data</label>
        <input id="campo-data" v-model="data" type="date" required>
        <button type="button" @click="data = somarDias(data, 7)">Próxima semana</button>
        <button type="button" @click="data = hojeNoFuso(fuso)">Hoje</button>
      </p>
      <CampoForm id="filtro" v-model="filtro" tipo="select" label="Situação">
        <option value="">Todas</option>
        <option v-for="s in STATUS_AGENDAMENTO" :key="s" :value="s">{{ rotuloStatus(s) }}</option>
      </CampoForm>
    </form>
    <p>Semana de {{ formatarNoFuso(`${segunda}T12:00:00Z`, 'UTC').data }} a {{ formatarNoFuso(`${domingo}T12:00:00Z`, 'UTC').data }} (fuso {{ fuso }})</p>

    <p><button type="button" class="btn-primario" @click="criando = !criando">{{ criando ? 'Fechar formulário' : 'Novo agendamento no balcão' }}</button></p>
    <FormAgendamentoManual v-if="criando" :fuso="fuso" @criado="criado" @fechar="criando = false" />

    <AvisoErro v-if="carga.erro.value" :mensagem="carga.erro.value" />
    <div v-if="carga.enviando.value" role="status">
      <p>Carregando…</p>
      <div class="esqueleto" aria-hidden="true" />
      <div class="esqueleto" aria-hidden="true" />
    </div>
    <p v-else-if="!itens.length && !carga.erro.value" class="vazio">Nenhum agendamento nesta semana.</p>

    <section v-for="[dia, lista] in porDia" :key="dia">
      <h2>{{ dia }}</h2>
      <ul>
        <AgendamentoItem v-for="a in lista" :key="a.id" :agendamento="a" :fuso="fuso" @atualizado="atualizado" />
      </ul>
    </section>
  </section>
</template>
