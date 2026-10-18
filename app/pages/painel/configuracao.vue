<script setup lang="ts">
const api = usePainelApi()
const { configuracao } = useConfiguracao()
const carga = useEnvio()
const envio = useEnvio()
const salvo = ref(false)

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
  <section>
    <h1>Configurações</h1>
    <AvisoErro v-if="carga.erro.value" :mensagem="carga.erro.value" />
    <form v-if="configuracao" class="cartao" @submit.prevent="salvar">
      <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
      <p>Fuso horário: {{ configuracao.timezone }}</p>
      <CampoForm id="antecedencia_min_agendamento_h" v-model="form.antecedencia_min_agendamento_h" tipo="number" min="0" required label="Antecedência mínima para agendar (horas)" :erros="envio.erros.value.antecedencia_min_agendamento_h" />
      <CampoForm id="antecedencia_min_cancelamento_h" v-model="form.antecedencia_min_cancelamento_h" tipo="number" min="0" required label="Antecedência mínima para cancelar (horas)" :erros="envio.erros.value.antecedencia_min_cancelamento_h" />
      <CampoForm id="janela_max_dias" v-model="form.janela_max_dias" tipo="number" min="1" required label="Janela máxima de agendamento (dias)" :erros="envio.erros.value.janela_max_dias" />
      <CampoForm id="intervalo_entre_atendimentos_min" v-model="form.intervalo_entre_atendimentos_min" tipo="number" min="0" required label="Intervalo entre atendimentos (minutos)" :erros="envio.erros.value.intervalo_entre_atendimentos_min" />
      <CampoForm id="confirmacao_automatica" v-model="form.confirmacao_automatica" tipo="checkbox" label="Confirmar agendamentos online automaticamente" />
      <button type="submit" :disabled="envio.enviando.value">{{ envio.enviando.value ? 'Salvando…' : 'Salvar' }}</button>
      <span v-if="salvo" role="status">Configurações salvas.</span>
    </form>
  </section>
</template>
