<script setup lang="ts">
import type { AgendamentoConsultado, Identificacao } from '~/composables/usePublico'
import type { ApiError } from '~/composables/useApi'

const slug = String(useRoute().params.slug)
const api = usePublico(slug)

// O token fica só em memória (nunca em query string, storage ou console).
let identificacao: Identificacao | null = null

const form = reactive({ codigo: '', telefone: '' })
const agendamento = ref<AgendamentoConsultado | null>(null)
const cancelado = ref(false)
const confirmando = ref(false)
const carregando = ref(false)
const erro = ref('')
const titulo = ref<HTMLElement | null>(null)
const tituloConfirmacao = ref<HTMLElement | null>(null)

onMounted(() => {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  if (!token) return
  // Remove o fragmento (com o token) da URL/histórico antes de qualquer outra coisa.
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  identificacao = { token }
  consultar()
})

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

async function consultar() {
  if (carregando.value || !identificacao) return
  carregando.value = true
  erro.value = ''
  try {
    agendamento.value = await api.consultar(identificacao)
    nextTick(() => titulo.value?.focus())
  }
  catch (e) {
    tratarErro(e as ApiError)
  }
  finally {
    carregando.value = false
  }
}

function consultarPorCodigo() {
  identificacao = { codigo: form.codigo.trim(), telefone: form.telefone.trim() }
  consultar()
}

function pedirConfirmacao() {
  confirmando.value = true
  nextTick(() => tituloConfirmacao.value?.focus())
}

async function cancelar() {
  if (carregando.value || !identificacao) return
  carregando.value = true
  erro.value = ''
  try {
    await api.cancelar(identificacao)
    cancelado.value = true
    confirmando.value = false
    if (agendamento.value) agendamento.value.status = 'cancelado_cliente'
    nextTick(() => titulo.value?.focus())
  }
  catch (e) {
    confirmando.value = false
    tratarErro(e as ApiError)
  }
  finally {
    carregando.value = false
  }
}
</script>

<template>
  <main>
    <h1>Meu agendamento</h1>
    <AvisoErro v-if="erro" :mensagem="erro" />

    <form v-if="!agendamento" @submit.prevent="consultarPorCodigo">
      <p>Informe o código recebido e o telefone usado no agendamento.</p>
      <p>
        <label for="campo-codigo">Código</label>
        <input id="campo-codigo" v-model="form.codigo" type="text" name="codigo" autocomplete="off" required maxlength="20">
      </p>
      <p>
        <label for="campo-telefone">WhatsApp (com DDD)</label>
        <input
          id="campo-telefone" v-model="form.telefone" type="tel" inputmode="tel" name="telefone"
          autocomplete="tel" required maxlength="30"
        >
      </p>
      <button type="submit" :disabled="carregando">{{ carregando ? 'Consultando…' : 'Consultar' }}</button>
    </form>

    <section v-else>
      <h2 ref="titulo" tabindex="-1">{{ cancelado ? 'Agendamento cancelado' : 'Dados do agendamento' }}</h2>
      <AgendamentoDetalhes
        :servico="agendamento.servico.nome"
        :profissional="agendamento.profissional"
        :inicio="agendamento.inicio"
        :preco="agendamento.preco"
        :codigo="agendamento.codigo"
        :status="agendamento.status"
      />
      <dl>
        <dt>Nome</dt>
        <dd>{{ agendamento.cliente.nome }}</dd>
        <dt>Telefone</dt>
        <dd>{{ agendamento.cliente.telefone }}</dd>
        <dt>Cancelamento permitido até</dt>
        <dd>{{ formatarIso(agendamento.cancelamento_ate).data }} às {{ formatarIso(agendamento.cancelamento_ate).hora }}</dd>
      </dl>

      <template v-if="!cancelado">
        <p v-if="!agendamento.pode_cancelar">Este agendamento não pode mais ser cancelado por aqui.</p>
        <button v-else-if="!confirmando" type="button" @click="pedirConfirmacao">Cancelar agendamento</button>
        <div v-else role="group" aria-labelledby="titulo-confirmacao">
          <h3 id="titulo-confirmacao" ref="tituloConfirmacao" tabindex="-1">Confirmar cancelamento</h3>
          <p>Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.</p>
          <button type="button" :disabled="carregando" @click="confirmando = false">Voltar</button>
          <button type="button" :disabled="carregando" @click="cancelar">Sim, cancelar agendamento</button>
        </div>
      </template>
      <p v-else role="status">Seu agendamento foi cancelado.</p>
    </section>
  </main>
</template>
