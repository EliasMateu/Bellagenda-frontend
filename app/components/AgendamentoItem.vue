<script setup lang="ts">
import type { AcaoAgendamento, AgendamentoPainel } from '~/composables/usePainel'

const props = defineProps<{ agendamento: AgendamentoPainel, fuso: string }>()
const emit = defineEmits<{ atualizado: [a: AgendamentoPainel] }>()

const api = usePainelApi()
const { enviando, erro, erros, executar, limpar } = useEnvio()

const ROTULOS: Record<AcaoAgendamento, string> = {
  confirmar: 'Confirmar',
  recusar: 'Recusar',
  cancelar: 'Cancelar',
  cancelar_cliente: 'Cliente cancelou',
  concluir: 'Concluir',
  faltou: 'Faltou',
  remarcar: 'Remarcar',
}
const CONFIRMA = new Set<AcaoAgendamento>(['recusar', 'cancelar', 'cancelar_cliente'])

const acoes = computed(() => ACOES_POR_STATUS[props.agendamento.status] ?? [])
const quando = computed(() => formatarNoFuso(props.agendamento.inicio, props.fuso))
const whatsapp = computed(() => linkWhatsApp(props.agendamento, props.fuso))

const pendente = ref<AcaoAgendamento | null>(null)
const remarcando = ref(false)
const novoInicio = ref('')
const override = ref(false)

function pedir(acao: AcaoAgendamento) {
  limpar()
  if (acao === 'remarcar') {
    novoInicio.value = paraLocal(props.agendamento.inicio, props.fuso)
    override.value = false
    remarcando.value = true
    pendente.value = null
  }
  else if (CONFIRMA.has(acao)) {
    pendente.value = acao
    remarcando.value = false
  }
  else {
    void aplicar(acao)
  }
}

async function aplicar(acao: AcaoAgendamento) {
  const id = props.agendamento.id
  const resposta = await executar(() =>
    acao === 'cancelar_cliente'
      ? api.agendamentos.acao(id, 'cancelar', { origem: 'cliente' })
      : api.agendamentos.acao(id, acao),
  )
  if (resposta) {
    pendente.value = null
    emit('atualizado', resposta)
  }
}

async function remarcar() {
  const resposta = await executar(() =>
    api.agendamentos.acao(props.agendamento.id, 'remarcar', {
      inicio: isoNoFuso(novoInicio.value, props.fuso),
      override_grade: override.value,
    }),
  )
  if (resposta) {
    remarcando.value = false
    emit('atualizado', resposta)
  }
}
</script>

<template>
  <li>
    <h3>{{ quando.hora }} — {{ agendamento.servico.nome }}</h3>
    <dl>
      <dt>Cliente</dt>
      <dd>{{ agendamento.cliente.nome }}</dd>
      <dt>Telefone</dt>
      <dd>{{ agendamento.cliente.telefone }}</dd>
      <dt>Data</dt>
      <dd>{{ quando.data }}</dd>
      <dt>Situação</dt>
      <dd>{{ rotuloStatus(agendamento.status) }}</dd>
      <template v-if="agendamento.observacao_cliente">
        <dt>Observação da cliente</dt>
        <dd>{{ agendamento.observacao_cliente }}</dd>
      </template>
    </dl>
    <AvisoErro v-if="erro" :mensagem="erro" />

    <p>
      <button
        v-for="a in acoes" :key="a" type="button" :disabled="enviando" @click="pedir(a)"
      >
        {{ ROTULOS[a] }}
      </button>
      <a :href="whatsapp" target="_blank" rel="noopener noreferrer">Avisar no WhatsApp</a>
    </p>

    <ConfirmarAcao
      v-if="pendente"
      :pergunta="`Tem certeza? Ação: ${ROTULOS[pendente]}. Isto não pode ser desfeito.`"
      rotulo="Sim, confirmar"
      :enviando="enviando"
      @voltar="pendente = null"
      @confirmar="aplicar(pendente!)"
    />

    <form v-if="remarcando" @submit.prevent="remarcar">
      <CampoForm id="inicio" v-model="novoInicio" tipo="datetime-local" label="Novo início" required :erros="erros.inicio" />
      <CampoForm id="override_grade" v-model="override" tipo="checkbox" label="Ignorar a grade de horários e bloqueios (atenção)" />
      <button type="button" :disabled="enviando" @click="remarcando = false">Voltar</button>
      <button type="submit" :disabled="enviando">{{ enviando ? 'Salvando…' : 'Remarcar' }}</button>
    </form>
  </li>
</template>
