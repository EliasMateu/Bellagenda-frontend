<script setup lang="ts">
import type { Servico } from '~/composables/usePublico'

const props = defineProps<{ servico: Servico, modelValue: number | null, indice: number }>()
defineEmits<{ 'update:modelValue': [id: number] }>()

const marcado = computed(() => props.modelValue === props.servico.id)
// Unhas e esmalte ganham o pincel; os demais, a tesoura.
const icone = computed(() => (/unha|esmalt|manicure|pedicure|\bm[ãa]os?\b/i.test(props.servico.nome) ? 'pincel' : 'servicos'))
</script>

<template>
  <label class="srv" :class="{ marcado }" :style="{ '--i': Math.min(indice, 5) }">
    <input
      class="srv-radio" type="radio" name="servico" :value="servico.id" :checked="marcado" required
      @change="$emit('update:modelValue', servico.id)"
    >
    <span class="srv-icone" aria-hidden="true"><UiIcon :nome="icone" :tamanho="22" /></span>
    <span class="srv-corpo">
      <span class="srv-nome">{{ servico.nome }}</span>
      <span class="srv-duracao"><UiIcon nome="relogio" :tamanho="14" /><span>{{ formatarDuracao(servico.duracao_min) }}</span></span>
    </span>
    <span class="srv-preco">{{ formatarPreco(servico.preco) }}</span>
    <span class="srv-selo" aria-hidden="true"><UiIcon nome="check" :tamanho="14" /></span>
  </label>
</template>
