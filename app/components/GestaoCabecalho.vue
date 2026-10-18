<script setup lang="ts">
defineProps<{ titulo: string, acao?: string }>()
defineEmits<{ acao: [] }>()
</script>

<template>
  <header class="gestao-topo">
    <h1>{{ titulo }}</h1>
    <button v-if="acao" type="button" class="btn-primario" @click="$emit('acao')">
      <UiIcon nome="mais" :tamanho="20" /> {{ acao }}
    </button>
  </header>
</template>
