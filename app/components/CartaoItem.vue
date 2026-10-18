<script setup lang="ts">
import type { UiMenuItem } from '~/utils/ui'

/** Cartão padrão das telas de gestão: conteúdo + selo, ação principal e menu de três pontos na mesma linha. */
defineProps<{ acaoRotulo?: string, menu?: UiMenuItem[] }>()
defineEmits<{ acao: [], menu: [id: string] }>()
</script>

<template>
  <li class="cartao-gestao">
    <div class="cg-cab">
      <div class="cg-texto"><slot /></div>
      <div v-if="$slots.selo" class="cg-selo"><slot name="selo" /></div>
    </div>
    <div v-if="acaoRotulo || menu?.length" class="cg-acoes">
      <button v-if="acaoRotulo" type="button" class="btn-secundario" @click="$emit('acao')">{{ acaoRotulo }}</button>
      <UiMenu
        v-if="menu?.length" label="Mais ações" aria-label="Mais ações" :items="menu" align="right"
        button-class="btn-secundario btn-icone" @select="id => $emit('menu', id)"
      >
        <template #botao>
          <UiIcon nome="mais-opcoes" :tamanho="20" />
        </template>
      </UiMenu>
    </div>
    <slot name="extra" />
  </li>
</template>
