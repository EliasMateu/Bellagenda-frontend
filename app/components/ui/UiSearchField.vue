<script setup lang="ts">
/** Busca única: lupa, campo e botão limpar (x) quando há texto. Enter dispara "enviar". */
defineProps<{ label: string, placeholder?: string }>()
const emit = defineEmits<{ enviar: [] }>()
const modelo = defineModel<string>({ default: '' })
const uid = useId()
const campo = ref<HTMLInputElement | null>(null)

function limpar() {
  modelo.value = ''
  emit('enviar')
  campo.value?.focus()
}
</script>

<template>
  <div class="busca" role="search">
    <label :for="uid" class="somente-leitor">{{ label }}</label>
    <UiIcon nome="lupa" :tamanho="20" class="busca-icone" />
    <input
      :id="uid" ref="campo" v-model="modelo" type="search" enterkeyhint="search" autocomplete="off"
      :placeholder="placeholder" @keydown.enter.prevent="emit('enviar')"
    >
    <button v-if="modelo" type="button" class="busca-limpar" aria-label="Limpar busca" @click="limpar">
      <UiIcon nome="fechar" :tamanho="20" />
    </button>
  </div>
</template>
