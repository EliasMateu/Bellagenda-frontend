<script setup lang="ts">
import type { ClientePainel } from '~/composables/usePainel'

const api = usePainelApi()
const carga = useEnvio()
const envio = useEnvio()

const clientes = ref<ClientePainel[]>([])
const busca = ref('')
const editando = ref<number | 'novo' | null>(null)
const form = reactive({ nome: '', telefone: '', observacoes: '' })

async function carregar() {
  const r = await carga.executar(() => api.clientes.listar({ busca: busca.value.trim() || undefined }))
  if (r) clientes.value = r
}

function abrir(c?: ClientePainel) {
  envio.limpar()
  editando.value = c ? c.id : 'novo'
  form.nome = c?.nome ?? ''
  form.telefone = c?.telefone ?? ''
  form.observacoes = c?.observacoes ?? ''
}

async function salvar() {
  const corpo = { nome: form.nome.trim(), telefone: form.telefone.trim(), observacoes: form.observacoes.trim() }
  const id = editando.value
  const r = await envio.executar(() => (typeof id === 'number' ? api.clientes.editar(id, corpo) : api.clientes.criar(corpo)))
  if (r) {
    editando.value = null
    await carregar()
  }
  else {
    await envio.focarPrimeiroErro(['nome', 'telefone', 'observacoes'])
  }
}

onMounted(carregar)
</script>

<template>
  <section>
    <h1>Clientes</h1>
    <form @submit.prevent="carregar">
      <CampoForm id="busca" v-model="busca" tipo="text" label="Buscar por nome ou telefone" />
      <button type="submit" :disabled="carga.enviando.value">Buscar</button>
    </form>
    <AvisoErro v-if="carga.erro.value" :mensagem="carga.erro.value" />
    <p><button type="button" @click="abrir()">Nova cliente</button></p>

    <form v-if="editando !== null" class="cartao" @submit.prevent="salvar">
      <h2>{{ editando === 'novo' ? 'Nova cliente' : 'Editar cliente' }}</h2>
      <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
      <CampoForm id="nome" v-model="form.nome" label="Nome" required maxlength="100" :erros="envio.erros.value.nome" />
      <CampoForm id="telefone" v-model="form.telefone" tipo="tel" label="WhatsApp (com DDD)" inputmode="tel" required :erros="envio.erros.value.telefone" />
      <CampoForm id="observacoes" v-model="form.observacoes" tipo="textarea" label="Observações" :erros="envio.erros.value.observacoes" />
      <button type="button" :disabled="envio.enviando.value" @click="editando = null">Cancelar</button>
      <button type="submit" :disabled="envio.enviando.value">{{ envio.enviando.value ? 'Salvando…' : 'Salvar' }}</button>
    </form>

    <p v-if="!clientes.length && !carga.enviando.value" class="vazio">Nenhuma cliente encontrada.</p>
    <ul>
      <li v-for="c in clientes" :key="c.id" class="linha">
        {{ c.nome }} — {{ c.telefone }}
        <span v-if="c.observacoes"> — {{ c.observacoes }}</span>
        <button type="button" @click="abrir(c)">Ver / editar</button>
      </li>
    </ul>
  </section>
</template>
