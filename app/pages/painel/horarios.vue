<script setup lang="ts">
import type { HorarioTrabalho } from '~/composables/usePainel'

const api = usePainelApi()
const carga = useEnvio()
const lista = useEnvio()
const envio = useEnvio()

const horarios = ref<HorarioTrabalho[]>([])
const editando = ref<number | 'novo' | null>(null)
const apagando = ref<number | null>(null)
const form = reactive({ dia_semana: '0' as string | number, inicio: '09:00', fim: '18:00' })

const porDia = computed(() =>
  DIAS_SEMANA.map((nome, dia) => ({ nome, dia, faixas: horarios.value.filter(h => h.dia_semana === dia) })),
)

async function carregar() {
  const r = await carga.executar(() => api.horarios.listar())
  if (r) horarios.value = r
}

function abrir(h?: HorarioTrabalho) {
  envio.limpar()
  editando.value = h ? h.id : 'novo'
  form.dia_semana = h?.dia_semana ?? 0
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
  if (r) horarios.value = horarios.value.filter(h => h.id !== id)
}

onMounted(carregar)
</script>

<template>
  <section>
    <h1>Horários de trabalho</h1>
    <AvisoErro v-if="carga.erro.value" :mensagem="carga.erro.value" />
    <AvisoErro v-if="lista.erro.value" :mensagem="lista.erro.value" />
    <p><button type="button" @click="abrir()">Nova faixa de horário</button></p>

    <form v-if="editando !== null" class="cartao" @submit.prevent="salvar">
      <h2>{{ editando === 'novo' ? 'Nova faixa' : 'Editar faixa' }}</h2>
      <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
      <CampoForm id="dia_semana" v-model="form.dia_semana" tipo="select" label="Dia da semana" :erros="envio.erros.value.dia_semana">
        <option v-for="(nome, i) in DIAS_SEMANA" :key="i" :value="i">{{ nome }}</option>
      </CampoForm>
      <CampoForm id="inicio" v-model="form.inicio" tipo="time" label="Início" required :erros="envio.erros.value.inicio" />
      <CampoForm id="fim" v-model="form.fim" tipo="time" label="Fim" required :erros="envio.erros.value.fim" />
      <button type="button" :disabled="envio.enviando.value" @click="editando = null">Cancelar</button>
      <button type="submit" :disabled="envio.enviando.value">{{ envio.enviando.value ? 'Salvando…' : 'Salvar' }}</button>
    </form>

    <section v-for="d in porDia" :key="d.dia">
      <h2>{{ d.nome }}</h2>
      <p v-if="!d.faixas.length" class="vazio">Sem atendimento.</p>
      <ul>
        <li v-for="h in d.faixas" :key="h.id" class="linha">
          {{ h.inicio.slice(0, 5) }} às {{ h.fim.slice(0, 5) }}
          <button type="button" :disabled="lista.enviando.value" @click="abrir(h)">Editar</button>
          <button type="button" :disabled="lista.enviando.value" @click="apagando = h.id">Apagar</button>
          <ConfirmarAcao
            v-if="apagando === h.id" pergunta="Apagar esta faixa de horário?" rotulo="Sim, apagar"
            :enviando="lista.enviando.value" @voltar="apagando = null" @confirmar="apagar(h.id)"
          />
        </li>
      </ul>
    </section>
  </section>
</template>
