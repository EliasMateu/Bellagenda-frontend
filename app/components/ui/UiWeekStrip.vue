<script setup lang="ts">
/** Faixa de 7 dias (domingo a sábado) da semana do dia selecionado. Toque seleciona; setas mudam de semana. */
const props = defineProps<{ marked?: string[], today?: string }>()
const modelo = defineModel<string>({ required: true })

const letras = letrasSemana()
const marcados = computed(() => new Set(props.marked ?? []))
const dias = computed(() => {
  const domingo = domingoDaSemana(modelo.value)
  return Array.from({ length: 7 }, (_, i) => somarDias(domingo, i))
})

const rotulo = (ymd: string) => {
  const extras = [ymd === props.today ? 'hoje' : '', marcados.value.has(ymd) ? 'com atendimentos' : ''].filter(Boolean).join(', ')
  return extras ? `${formatarDataLonga(ymd)}, ${extras}` : formatarDataLonga(ymd)
}
</script>

<template>
  <div class="faixa-semana" role="group" aria-label="Dias da semana">
    <button type="button" class="btn-icone" aria-label="Semana anterior" @click="modelo = somarDias(modelo, -7)">
      <UiIcon nome="chevron-esquerda" />
    </button>
    <div class="faixa-dias">
      <button
        v-for="(d, i) in dias" :key="d" type="button" class="faixa-dia" :aria-pressed="d === modelo"
        :aria-current="d === today ? 'date' : undefined" :aria-label="rotulo(d)" :class="{ hoje: d === today }"
        @click="modelo = d"
      >
        <span class="faixa-letra" aria-hidden="true">{{ letras[i]?.letra }}</span>
        <span class="faixa-num" aria-hidden="true">{{ numeroDoDia(d) }}</span>
        <span class="ponto" :class="{ vazio: !marcados.has(d) }" aria-hidden="true" />
      </button>
    </div>
    <button type="button" class="btn-icone" aria-label="Próxima semana" @click="modelo = somarDias(modelo, 7)">
      <UiIcon nome="chevron-direita" />
    </button>
  </div>
</template>
