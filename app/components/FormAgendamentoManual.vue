<script setup lang="ts">
import type { AgendamentoPainel, ClientePainel, ServicoPainel } from '~/composables/usePainel'

const props = defineProps<{ fuso: string }>()
const emit = defineEmits<{ criado: [a: AgendamentoPainel], fechar: [] }>()

const api = usePainelApi()
const { enviando, erro, erros, executar, limpar } = useEnvio()

const servicos = ref<ServicoPainel[]>([])
const modo = ref<'existente' | 'novo'>('existente')
const busca = ref('')
const encontrados = ref<ClientePainel[]>([])
const buscando = ref(false)
const buscou = ref(false)
const form = reactive({
  clienteId: null as number | null,
  nome: '',
  telefone: '',
  servico: '' as string | number,
  inicio: '',
  observacao: '',
  override: false,
})

onMounted(async () => {
  await executar(async () => {
    servicos.value = (await api.servicos.listar()).filter(s => s.ativo)
  })
})

async function buscar() {
  if (buscando.value) return
  buscando.value = true
  await executar(async () => {
    encontrados.value = await api.clientes.listar({ busca: busca.value.trim() })
    buscou.value = true
  })
  buscando.value = false
}

async function criar() {
  const fuso = props.fuso
  const corpo: Record<string, unknown> = {
    servico: form.servico,
    inicio: isoNoFuso(form.inicio, fuso),
    observacao_cliente: form.observacao.trim(),
    override_grade: form.override,
  }
  if (modo.value === 'existente') corpo.cliente = form.clienteId
  else {
    corpo.cliente_nome = form.nome.trim()
    corpo.cliente_telefone = form.telefone.trim()
  }
  const criado = await executar(() => api.agendamentos.criar(corpo))
  if (criado) emit('criado', criado)
}
</script>

<template>
  <form @submit.prevent="criar">
    <h2>Novo agendamento no balcão</h2>
    <AvisoErro v-if="erro" :mensagem="erro" />

    <fieldset>
      <legend>Cliente</legend>
      <p>
        <input id="modo-existente" v-model="modo" type="radio" name="modo" value="existente">
        <label for="modo-existente">Cliente cadastrada</label>
        <input id="modo-novo" v-model="modo" type="radio" name="modo" value="novo">
        <label for="modo-novo">Nova cliente</label>
      </p>
      <template v-if="modo === 'existente'">
        <p>
          <label for="campo-busca">Buscar por nome ou telefone</label>
          <input id="campo-busca" v-model="busca" type="search" @keydown.enter.prevent="buscar">
          <button type="button" :disabled="buscando" @click="buscar">Buscar</button>
        </p>
        <p v-if="buscou && !encontrados.length">Nenhuma cliente encontrada.</p>
        <p v-for="c in encontrados" :key="c.id">
          <input :id="`cli-${c.id}`" v-model="form.clienteId" type="radio" name="cliente" :value="c.id">
          <label :for="`cli-${c.id}`">{{ c.nome }} — {{ c.telefone }}</label>
        </p>
        <span v-if="erros.cliente" role="alert">{{ erros.cliente.join(' ') }}</span>
      </template>
      <template v-else>
        <CampoForm id="cliente_nome" v-model="form.nome" label="Nome" required minlength="2" maxlength="100" :erros="erros.cliente_nome" />
        <CampoForm id="cliente_telefone" v-model="form.telefone" tipo="tel" label="WhatsApp (com DDD)" inputmode="tel" required :erros="erros.cliente_telefone" />
      </template>
    </fieldset>

    <CampoForm id="servico" v-model="form.servico" tipo="select" label="Serviço" required :erros="erros.servico">
      <option value="" disabled>Selecione</option>
      <option v-for="s in servicos" :key="s.id" :value="s.id">{{ s.nome }} ({{ s.duracao_min }} min)</option>
    </CampoForm>
    <CampoForm id="inicio" v-model="form.inicio" tipo="datetime-local" label="Início" required :erros="erros.inicio" />
    <CampoForm id="observacao_cliente" v-model="form.observacao" tipo="textarea" label="Observação (opcional)" maxlength="500" :erros="erros.observacao_cliente" />
    <CampoForm id="override_grade" v-model="form.override" tipo="checkbox" label="Ignorar a grade de horários e bloqueios (atenção: pode marcar fora do expediente)" />

    <button type="button" :disabled="enviando" @click="emit('fechar')">Fechar</button>
    <button type="submit" :disabled="enviando">{{ enviando ? 'Salvando…' : 'Criar agendamento' }}</button>
  </form>
</template>
