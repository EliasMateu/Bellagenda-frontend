<script setup lang="ts">
defineProps<{ pergunta: string, rotulo: string, enviando?: boolean }>()
defineEmits<{ confirmar: [], voltar: [] }>()
const titulo = ref<HTMLElement | null>(null)
onMounted(() => titulo.value?.focus())
</script>

<template>
  <div role="group" aria-label="Confirmação">
    <p ref="titulo" tabindex="-1">{{ pergunta }}</p>
    <button type="button" :disabled="enviando" @click="$emit('voltar')">Voltar</button>
    <button type="button" :disabled="enviando" @click="$emit('confirmar')">{{ rotulo }}</button>
  </div>
</template>
