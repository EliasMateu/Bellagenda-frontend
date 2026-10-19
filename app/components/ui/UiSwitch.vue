<script setup lang="ts">
/** Interruptor (role=switch). Espaço/Enter alternam; alvo de 44 px; estado também por marca ✓ (não só cor). */
defineProps<{ label: string, ajuda?: string }>()
const modelo = defineModel<boolean>({ default: false })
const uid = useId()
</script>

<template>
  <div class="switch-linha">
    <div class="switch-texto">
      <span :id="`${uid}-rotulo`" class="switch-rotulo">{{ label }}</span>
      <small v-if="ajuda" :id="`${uid}-ajuda`" class="ajuda">{{ ajuda }}</small>
    </div>
    <button
      type="button" role="switch" class="switch" :aria-checked="modelo" :aria-labelledby="`${uid}-rotulo`"
      :aria-describedby="ajuda ? `${uid}-ajuda` : undefined" @click="modelo = !modelo"
    >
      <span class="switch-trilho" aria-hidden="true"><span class="switch-bola" /></span>
    </button>
  </div>
</template>
