<script setup lang="ts">
import type { Bloqueio } from '~/composables/usePainel'

const api = usePainelApi()
const { fuso } = useConfiguracao()
const carga = useEnvio()
const lista = useEnvio()
const envio = useEnvio()

const bloqueios = ref<Bloqueio[]>([])
const editando = ref<number | 'novo' | null>(null)
const apagando = ref<number | null>(null)
const form = reactive({ inicio: '', fim: '', motivo: '' })

async function carregar() {
  const r = await carga.executar(() => api.bloqueios.listar())
  if (r) bloqueios.value = r
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

function periodo(b: Bloqueio) {
  const i = formatarNoFuso(b.inicio, fuso.value)
  const f = formatarNoFuso(b.fim, fuso.value)
  return `${i.data} ${i.hora} até ${f.data} ${f.hora}`
}

onMounted(carregar)
</script>

<template>
  <section>
    <h1>Bloqueios</h1>
    <p>Períodos em que você não atende (folgas, férias, compromissos). Horários no fuso {{ fuso }}.</p>
    <AvisoErro v-if="carga.erro.value" :mensagem="carga.erro.value" />
    <AvisoErro v-if="lista.erro.value" :mensagem="lista.erro.value" />
    <p><button type="button" @click="abrir()">Novo bloqueio</button></p>

    <form v-if="editando !== null" class="cartao" @submit.prevent="salvar">
      <h2>{{ editando === 'novo' ? 'Novo bloqueio' : 'Editar bloqueio' }}</h2>
      <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
      <CampoForm id="inicio" v-model="form.inicio" tipo="datetime-local" label="Início" :hoje="hojeNoFuso(fuso)" :erros="envio.erros.value.inicio" />
      <CampoForm id="fim" v-model="form.fim" tipo="datetime-local" label="Fim" :hoje="hojeNoFuso(fuso)" :erros="envio.erros.value.fim" />
      <CampoForm id="motivo" v-model="form.motivo" label="Motivo (opcional)" maxlength="200" :erros="envio.erros.value.motivo" />
      <button type="button" :disabled="envio.enviando.value" @click="editando = null">Cancelar</button>
      <button type="submit" :disabled="envio.enviando.value">{{ envio.enviando.value ? 'Salvando…' : 'Salvar' }}</button>
    </form>

    <p v-if="!bloqueios.length && !carga.enviando.value" class="vazio">Nenhum bloqueio cadastrado.</p>
    <ul>
      <li v-for="b in bloqueios" :key="b.id" class="linha">
        {{ periodo(b) }}<template v-if="b.motivo"> — {{ b.motivo }}</template>
        <button type="button" :disabled="lista.enviando.value" @click="abrir(b)">Editar</button>
        <button type="button" :disabled="lista.enviando.value" @click="apagando = b.id">Apagar</button>
        <ConfirmarAcao
          v-if="apagando === b.id" pergunta="Apagar este bloqueio?" rotulo="Sim, apagar"
          :enviando="lista.enviando.value" @voltar="apagando = null" @confirmar="apagar(b.id)"
        />
      </li>
    </ul>
  </section>
</template>
