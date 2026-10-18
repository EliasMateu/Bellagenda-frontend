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

// No máximo 2 ações visíveis por status; o restante vai para "Mais ações".
const PRINCIPAIS: Record<string, AcaoAgendamento[]> = {
  pendente: ['confirmar', 'recusar'],
  confirmado: ['concluir', 'remarcar'],
}
const ROTULO_CURTO: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  falta: 'Faltou',
  cancelado_cliente: 'Cancelado',
  cancelado_salao: 'Recusado',
}

function classeAcao(a: AcaoAgendamento) {
  if (a === 'confirmar' || a === 'concluir') return 'btn-primario'
  return CONFIRMA.has(a) ? 'btn-perigo' : 'btn-secundario'
}

const acoes = computed(() => ACOES_POR_STATUS[props.agendamento.status] ?? [])
const principais = computed(() => acoes.value.filter(a => PRINCIPAIS[props.agendamento.status]?.includes(a)))
const secundarias = computed(() => acoes.value.filter(a => !principais.value.includes(a)))
const itensMenu = computed(() =>
  secundarias.value.map(a => ({ id: a, label: ROTULOS[a], danger: CONFIRMA.has(a) })),
)
const quando = computed(() => formatarNoFuso(props.agendamento.inicio, props.fuso))
const whatsapp = computed(() => linkWhatsApp(props.agendamento, props.fuso))
const rotuloCurto = computed(() => ROTULO_CURTO[props.agendamento.status] ?? props.agendamento.status)

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
  <li class="item-agendamento">
    <div class="item-topo">
      <p class="item-hora">{{ quando.hora }}</p>
      <div class="item-info">
        <p class="item-nome">{{ agendamento.cliente.nome }}</p>
        <p class="item-sub">{{ agendamento.servico.nome }} · {{ agendamento.servico.duracao_min }} min</p>
        <p class="item-tel">{{ agendamento.cliente.telefone }}</p>
      </div>
      <div class="item-lado">
        <span
          class="distintivo-status" :data-status="agendamento.status" :title="rotuloStatus(agendamento.status)"
          :aria-label="rotuloStatus(agendamento.status)"
        >{{ rotuloCurto }}</span>
        <a
          :href="whatsapp" class="btn btn-icone" target="_blank" rel="noopener noreferrer"
          aria-label="Avisar no WhatsApp" title="Avisar no WhatsApp"
        ><UiIcon nome="whatsapp" /></a>
      </div>
    </div>
    <p v-if="agendamento.observacao_cliente" class="item-obs">
      <span class="somente-leitor">Observação da cliente: </span>{{ agendamento.observacao_cliente }}
    </p>
    <AvisoErro v-if="erro" :mensagem="erro" />

    <div v-if="principais.length || itensMenu.length" class="item-acoes">
      <button
        v-for="a in principais" :key="a" type="button" :class="classeAcao(a)" :disabled="enviando"
        :aria-busy="enviando || undefined" @click="pedir(a)"
      >
        {{ ROTULOS[a] }}
      </button>
      <UiMenu
        v-if="itensMenu.length" label="Mais" aria-label="Mais ações" :items="itensMenu" align="right"
        button-class="btn-secundario" @select="id => pedir(id as AcaoAgendamento)"
      >
        <template #botao>
          <UiIcon nome="mais-opcoes" :tamanho="20" /> Mais
        </template>
      </UiMenu>
    </div>

    <ConfirmarAcao
      v-if="pendente"
      :pergunta="`Tem certeza? Ação: ${ROTULOS[pendente]}. Isto não pode ser desfeito.`"
      rotulo="Sim, confirmar"
      :enviando="enviando"
      @voltar="pendente = null"
      @confirmar="aplicar(pendente!)"
    />

    <form v-if="remarcando" class="confirmacao" @submit.prevent="remarcar">
      <CampoForm id="inicio" v-model="novoInicio" tipo="datetime-local" label="Novo início" :hoje="hojeNoFuso(fuso)" :erros="erros.inicio" />
      <CampoForm id="override_grade" v-model="override" tipo="checkbox" label="Ignorar a grade de horários e bloqueios (atenção)" />
      <button type="button" class="btn-secundario" :disabled="enviando" @click="remarcando = false">Voltar</button>
      <button type="submit" :disabled="enviando" :aria-busy="enviando || undefined">{{ enviando ? 'Salvando…' : 'Remarcar' }}</button>
    </form>
  </li>
</template>
