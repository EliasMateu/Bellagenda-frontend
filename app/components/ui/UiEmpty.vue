<script setup lang="ts">
import type { NomeIcone } from '~/components/ui/UiIcon.vue'

defineProps<{ icone: NomeIcone, titulo: string, texto?: string, acao?: string }>()
defineEmits<{ acao: [] }>()
</script>

<template>
  <div class="estado-vazio">
    <UiIcon :nome="icone" :tamanho="56" class="icone-vazio" />
    <h2>{{ titulo }}</h2>
    <p v-if="texto">{{ texto }}</p>
    <button v-if="acao" type="button" class="btn-secundario" @click="$emit('acao')">{{ acao }}</button>
  </div>
</template>
