<script setup lang="ts">
import type { ServicoPainel } from '~/composables/usePainel'

const api = usePainelApi()
const carga = useEnvio()
const lista = useEnvio()
const envio = useEnvio()

const servicos = ref<ServicoPainel[]>([])
const editando = ref<number | 'novo' | null>(null)
const apagando = ref<number | null>(null)
const form = reactive({ nome: '', duracao_min: '' as string | number, preco: '', ativo: true })

async function carregar() {
  const r = await carga.executar(() => api.servicos.listar())
  if (r) servicos.value = r
}

function abrir(s?: ServicoPainel) {
  envio.limpar()
  editando.value = s ? s.id : 'novo'
  form.nome = s?.nome ?? ''
  form.duracao_min = s?.duracao_min ?? ''
  form.preco = s?.preco ?? ''
  form.ativo = s?.ativo ?? true
}

async function salvar() {
  const corpo = {
    nome: form.nome.trim(),
    duracao_min: Number(form.duracao_min),
    preco: String(form.preco).replace(',', '.'),
    ativo: form.ativo,
  }
  const id = editando.value
  const r = await envio.executar(() => (typeof id === 'number' ? api.servicos.editar(id, corpo) : api.servicos.criar(corpo)))
  if (r) {
    editando.value = null
    await carregar()
  }
  else {
    await envio.focarPrimeiroErro(['nome', 'duracao_min', 'preco'])
  }
}

async function alternar(s: ServicoPainel) {
  const r = await lista.executar(() => api.servicos.editar(s.id, { ativo: !s.ativo }))
  if (r) servicos.value = servicos.value.map(x => (x.id === s.id ? r : x))
}

async function apagar(id: number) {
  const r = await lista.executar(async () => {
    await api.servicos.apagar(id)
    return true
  })
  if (r) {
    apagando.value = null
    servicos.value = servicos.value.filter(s => s.id !== id)
  }
  else {
    apagando.value = null
  }
}

onMounted(carregar)
</script>

<template>
  <section>
    <h1>Serviços</h1>
    <AvisoErro v-if="carga.erro.value" :mensagem="carga.erro.value" />
    <AvisoErro v-if="lista.erro.value" :mensagem="lista.erro.value" />
    <p v-if="lista.erro.value.includes('uso')">Dica: desative o serviço em vez de apagar.</p>

    <p><button type="button" @click="abrir()">Novo serviço</button></p>

    <form v-if="editando !== null" @submit.prevent="salvar">
      <h2>{{ editando === 'novo' ? 'Novo serviço' : 'Editar serviço' }}</h2>
      <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
      <CampoForm id="nome" v-model="form.nome" label="Nome" required maxlength="100" :erros="envio.erros.value.nome" />
      <CampoForm id="duracao_min" v-model="form.duracao_min" tipo="number" label="Duração (minutos)" required min="1" :erros="envio.erros.value.duracao_min" />
      <CampoForm id="preco" v-model="form.preco" label="Preço (R$)" inputmode="decimal" required :erros="envio.erros.value.preco" />
      <CampoForm id="ativo" v-model="form.ativo" tipo="checkbox" label="Ativo (aparece para agendamento)" />
      <button type="button" :disabled="envio.enviando.value" @click="editando = null">Cancelar</button>
      <button type="submit" :disabled="envio.enviando.value">{{ envio.enviando.value ? 'Salvando…' : 'Salvar' }}</button>
    </form>

    <p v-if="!servicos.length && !carga.enviando.value">Nenhum serviço cadastrado.</p>
    <ul>
      <li v-for="s in servicos" :key="s.id">
        {{ s.nome }} — {{ s.duracao_min }} min — {{ formatarPreco(s.preco) }} — {{ s.ativo ? 'Ativo' : 'Inativo' }}
        <button type="button" :disabled="lista.enviando.value" @click="abrir(s)">Editar</button>
        <button type="button" :disabled="lista.enviando.value" @click="alternar(s)">{{ s.ativo ? 'Inativar' : 'Ativar' }}</button>
        <button type="button" :disabled="lista.enviando.value" @click="apagando = s.id">Apagar</button>
        <ConfirmarAcao
          v-if="apagando === s.id" pergunta="Apagar este serviço? Isto não pode ser desfeito." rotulo="Sim, apagar"
          :enviando="lista.enviando.value" @voltar="apagando = null" @confirmar="apagar(s.id)"
        />
      </li>
    </ul>
  </section>
</template>
