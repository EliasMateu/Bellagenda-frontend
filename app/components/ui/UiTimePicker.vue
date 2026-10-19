<script setup lang="ts">
/** Horário 24h (HH:MM) em passo configurável, escolhido numa lista (UiSelect: mesmas teclas). */
const props = withDefaults(defineProps<{
  id?: string
  label?: string
  placeholder?: string
  step?: number
  min?: string
  max?: string
  erro?: boolean
  disabled?: boolean
  ariaLabel?: string
}>(), { step: 15 })
const modelo = defineModel<string>({ default: '' })

const aMinutos = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const deMinutos = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

const opcoes = computed(() => {
  const ini = aMinutos(props.min ?? '00:00')
  const fim = aMinutos(props.max ?? '23:59')
  const valores: string[] = []
  for (let n = ini; n <= fim; n += Math.max(1, props.step)) valores.push(deMinutos(n))
  // valor existente fora do passo (ex.: 09:07 vindo do servidor) continua selecionável
  if (modelo.value && !valores.includes(modelo.value)) valores.push(modelo.value)
  valores.sort()
  return valores.map(v => ({ value: v, label: v }))
})
</script>

<template>
  <UiSelect
    :id="id" v-model="modelo" :options="opcoes" :label="label ?? 'Escolher horário'"
    :placeholder="placeholder ?? 'Escolher hora'" :erro="erro" :disabled="disabled" :aria-label="ariaLabel"
  />
</template>
