<script setup lang="ts">
/**
 * Data + hora compostas. v-model: "AAAA-MM-DDTHH:mm" (mesmo formato do datetime-local), '' enquanto incompleto.
 * Ao escolher só a data, a hora começa em 09:00 (editável).
 */
const props = defineProps<{
  id?: string
  label?: string
  min?: string
  max?: string
  today?: string
  step?: number
  erro?: boolean
  disabled?: boolean
}>()
const modelo = defineModel<string>({ default: '' })

const data = ref('')
const hora = ref('')

function ler(v: string) {
  const [d = '', t = ''] = v.split('T')
  data.value = d
  hora.value = t.slice(0, 5)
}
ler(modelo.value)

watch(modelo, (v) => {
  if (v !== combinado()) ler(v)
})

function combinado() {
  return data.value && hora.value ? `${data.value}T${hora.value}` : ''
}
function atualizar() {
  if (data.value && !hora.value) hora.value = '09:00'
  modelo.value = combinado()
}
const rotulo = computed(() => props.label ?? 'Data e hora')
</script>

<template>
  <div class="ui-datahora">
    <UiDatePicker
      :id="id" v-model="data" :min="min" :max="max" :today="today" :label="`${rotulo}: data`"
      :erro="erro" :disabled="disabled" @update:model-value="atualizar"
    />
    <UiTimePicker
      :id="id ? `${id}-hora` : undefined" v-model="hora" :step="step" :label="`${rotulo}: horário`"
      :aria-label="`${rotulo}: horário`" :erro="erro" :disabled="disabled" @update:model-value="atualizar"
    />
  </div>
</template>
