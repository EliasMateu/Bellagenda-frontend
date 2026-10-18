<script setup lang="ts">
const api = usePainelApi()
const { configuracao } = useConfiguracao()
const carga = useEnvio()
const envio = useEnvio()
const salvo = ref(false)
const linkPublico = useLinkPublico()

const form = reactive({
  antecedencia_min_agendamento_h: '' as string | number,
  antecedencia_min_cancelamento_h: '' as string | number,
  janela_max_dias: '' as string | number,
  intervalo_entre_atendimentos_min: '' as string | number,
  confirmacao_automatica: false,
})

function preencher() {
  const c = configuracao.value
  if (!c) return
  form.antecedencia_min_agendamento_h = c.antecedencia_min_agendamento_h
  form.antecedencia_min_cancelamento_h = c.antecedencia_min_cancelamento_h
  form.janela_max_dias = c.janela_max_dias
  form.intervalo_entre_atendimentos_min = c.intervalo_entre_atendimentos_min
  form.confirmacao_automatica = c.confirmacao_automatica
}

preencher() // já preenche com a configuração carregada pelo layout (evita "alterado" falso)

// Há alterações não salvas quando o formulário difere da configuração carregada.
const alterado = computed(() => {
  const c = configuracao.value
  if (!c) return false
  return Number(form.antecedencia_min_agendamento_h) !== c.antecedencia_min_agendamento_h
    || Number(form.antecedencia_min_cancelamento_h) !== c.antecedencia_min_cancelamento_h
    || Number(form.janela_max_dias) !== c.janela_max_dias
    || Number(form.intervalo_entre_atendimentos_min) !== c.intervalo_entre_atendimentos_min
    || form.confirmacao_automatica !== c.confirmacao_automatica
})
watch(alterado, (v) => {
  if (v) salvo.value = false
})

onMounted(async () => {
  const c = await carga.executar(() => api.configuracao.obter())
  if (c) configuracao.value = c
  preencher()
})

async function salvar() {
  salvo.value = false
  // O fuso (timezone) é somente leitura aqui e não é enviado.
  const r = await envio.executar(() =>
    api.configuracao.editar({
      antecedencia_min_agendamento_h: Number(form.antecedencia_min_agendamento_h),
      antecedencia_min_cancelamento_h: Number(form.antecedencia_min_cancelamento_h),
      janela_max_dias: Number(form.janela_max_dias),
      intervalo_entre_atendimentos_min: Number(form.intervalo_entre_atendimentos_min),
      confirmacao_automatica: form.confirmacao_automatica,
    }),
  )
  if (r) {
    configuracao.value = r
    salvo.value = true
  }
  else {
    await envio.focarPrimeiroErro(['antecedencia_min_agendamento_h', 'antecedencia_min_cancelamento_h', 'janela_max_dias', 'intervalo_entre_atendimentos_min'])
  }
}
</script>

<template>
  <section class="gestao">
    <GestaoCabecalho titulo="Configurações" />
    <AvisoErro v-if="carga.erro.value" :mensagem="carga.erro.value" />

    <div class="cartao secao-config">
      <h2>Link de agendamento</h2>
      <p class="ajuda">Envie este link para suas clientes agendarem sozinhas.</p>
      <div class="campo">
        <label for="link-publico">Link</label>
        <input id="link-publico" type="text" readonly :value="linkPublico.link.value">
      </div>
      <p class="acoes">
        <button type="button" class="btn-secundario" @click="linkPublico.copiar">
          <UiIcon :nome="linkPublico.copiado.value ? 'check' : 'copiar'" :tamanho="20" />
          {{ linkPublico.copiado.value ? 'Copiado' : 'Copiar' }}
        </button>
        <a :href="linkPublico.caminho.value" class="btn" target="_blank" rel="noopener">Abrir</a>
      </p>
      <p class="somente-leitor" role="status" aria-live="polite">{{ linkPublico.copiado.value ? 'Link copiado.' : '' }}</p>
    </div>

    <form v-if="configuracao" class="config-form" @submit.prevent="salvar">
      <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />

      <div class="cartao secao-config">
        <h2>Regras de agendamento</h2>
        <CampoForm
          id="antecedencia_min_agendamento_h" v-model="form.antecedencia_min_agendamento_h" tipo="number" min="0" required
          sufixo="horas" label="Antecedência para agendar" ajuda="Tempo mínimo entre o agendamento e o atendimento."
          inputmode="numeric" :erros="envio.erros.value.antecedencia_min_agendamento_h"
        />
        <CampoForm
          id="antecedencia_min_cancelamento_h" v-model="form.antecedencia_min_cancelamento_h" tipo="number" min="0" required
          sufixo="horas" label="Antecedência para cancelar" ajuda="Até quando a cliente pode cancelar sozinha."
          inputmode="numeric" :erros="envio.erros.value.antecedencia_min_cancelamento_h"
        />
        <CampoForm
          id="janela_max_dias" v-model="form.janela_max_dias" tipo="number" min="1" required sufixo="dias"
          label="Janela de agendamento" ajuda="Até quantos dias à frente é possível agendar."
          inputmode="numeric" :erros="envio.erros.value.janela_max_dias"
        />
        <CampoForm
          id="intervalo_entre_atendimentos_min" v-model="form.intervalo_entre_atendimentos_min" tipo="number" min="0" required
          sufixo="min" label="Intervalo entre atendimentos" ajuda="Folga reservada depois de cada atendimento."
          inputmode="numeric" :erros="envio.erros.value.intervalo_entre_atendimentos_min"
        />
      </div>

      <div class="cartao secao-config">
        <h2>Confirmação</h2>
        <UiSwitch
          v-model="form.confirmacao_automatica" label="Confirmar agendamentos online automaticamente"
          ajuda="Desligado: cada agendamento fica pendente até você confirmar."
        />
      </div>

      <div class="cartao secao-config">
        <h2>Fuso horário</h2>
        <dl class="detalhes">
          <dt>Fuso</dt>
          <dd>{{ configuracao.timezone }}</dd>
        </dl>
        <p class="ajuda">O fuso não pode ser alterado por aqui.</p>
      </div>

      <div class="barra-salvar">
        <p class="barra-msg" role="status" aria-live="polite">{{ salvo ? 'Alterações salvas' : '' }}</p>
        <button type="submit" :disabled="!alterado || envio.enviando.value" :aria-busy="envio.enviando.value || undefined">
          {{ envio.enviando.value ? 'Salvando…' : 'Salvar alterações' }}
        </button>
      </div>
    </form>
  </section>
</template>
