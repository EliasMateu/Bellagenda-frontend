<script setup lang="ts">
defineProps<{ pergunta: string, rotulo: string, enviando?: boolean }>()
defineEmits<{ confirmar: [], voltar: [] }>()
const titulo = ref<HTMLElement | null>(null)
onMounted(() => titulo.value?.focus())
</script>

<template>
  <div class="confirmacao" role="group" aria-label="Confirmação">
    <p ref="titulo" tabindex="-1"><strong>{{ pergunta }}</strong></p>
    <p>
      <button type="button" class="btn-secundario" :disabled="enviando" @click="$emit('voltar')">Voltar</button>
      <button type="button" class="btn-perigo" :disabled="enviando" @click="$emit('confirmar')">{{ rotulo }}</button>
    </p>
  </div>
</template>
