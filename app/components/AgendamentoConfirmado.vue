<script setup lang="ts">
import type { AgendamentoCriado } from '~/composables/usePublico'

const props = defineProps<{ slug: string, criado: AgendamentoCriado['agendamento'] }>()

// O token só existe nesta resposta; vai no fragmento (#) para não chegar a logs/referrer do servidor.
const link = computed(() =>
  `${window.location.origin}/p/${encodeURIComponent(props.slug)}/meu-agendamento#token=${encodeURIComponent(props.criado.token)}`,
)

const whatsapp = computed(() => {
  const { data, hora } = formatarIso(props.criado.inicio)
  const texto = `Meu agendamento com ${props.criado.profissional}: ${props.criado.servico} em ${data} às ${hora}. `
    + `Código ${props.criado.codigo}. Para consultar ou cancelar: ${link.value}`
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
})

const copiado = ref(false)
async function copiar() {
  try {
    await navigator.clipboard.writeText(link.value)
    copiado.value = true
  }
  catch {
    copiado.value = false
  }
}

const titulo = ref<HTMLElement | null>(null)
onMounted(() => titulo.value?.focus())
</script>

<template>
  <section>
    <h2 ref="titulo" tabindex="-1">Agendamento recebido</h2>
    <AgendamentoDetalhes
      :servico="criado.servico"
      :profissional="criado.profissional"
      :inicio="criado.inicio"
      :codigo="criado.codigo"
      :status="criado.status"
    />
    <p><strong>Guarde este link agora.</strong> Ele aparece somente nesta tela e é necessário para consultar ou cancelar o agendamento.</p>
    <p>
      <label for="link-gestao">Link para gerenciar o agendamento</label><br>
      <input id="link-gestao" type="text" readonly :value="link">
    </p>
    <p>
      <button type="button" @click="copiar">Copiar link</button>
      <a :href="whatsapp" target="_blank" rel="noopener noreferrer">Salvar no WhatsApp</a>
    </p>
    <p v-if="copiado" role="status">Link copiado.</p>
  </section>
</template>
