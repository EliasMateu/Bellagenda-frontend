<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  label: string
  tipo?: 'text' | 'number' | 'date' | 'time' | 'datetime-local' | 'tel' | 'password' | 'textarea' | 'select' | 'checkbox'
  erros?: string[]
}>()

const modelo = defineModel<string | number | boolean>({ default: '' })
const campo = computed(() => `campo-${props.id}`)
const idErro = computed(() => (props.erros?.length ? `erro-${props.id}` : undefined))
</script>

<template>
  <p :class="tipo === 'checkbox' ? 'campo campo-check' : 'campo'">
    <template v-if="tipo === 'checkbox'">
      <input :id="campo" v-model="modelo" type="checkbox" :name="id" :aria-describedby="idErro" :aria-invalid="!!idErro" v-bind="$attrs">
      <label :for="campo">{{ label }}</label>
    </template>
    <template v-else>
      <label :for="campo">{{ label }}</label>
      <textarea v-if="tipo === 'textarea'" :id="campo" v-model="modelo as string" :name="id" :aria-describedby="idErro" :aria-invalid="!!idErro" v-bind="$attrs" />
      <select v-else-if="tipo === 'select'" :id="campo" v-model="modelo" :name="id" :aria-describedby="idErro" :aria-invalid="!!idErro" v-bind="$attrs">
        <slot />
      </select>
      <input v-else :id="campo" v-model="modelo" :type="tipo ?? 'text'" :name="id" :aria-describedby="idErro" :aria-invalid="!!idErro" v-bind="$attrs">
    </template>
    <span v-if="idErro" :id="idErro" role="alert">{{ erros?.join(' ') }}</span>
  </p>
</template>
