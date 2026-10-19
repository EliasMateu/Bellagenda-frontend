<script setup lang="ts">
import type { UiOption } from '~/utils/ui'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  label: string
  tipo?: 'text' | 'number' | 'tel' | 'password' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time' | 'datetime-local'
  erros?: string[]
  /** Somente tipo select. */
  options?: UiOption[]
  placeholder?: string
  /** Texto de ajuda de uma linha abaixo do campo. */
  ajuda?: string
  /** Unidades visuais dentro do campo (ex.: R$ e min). */
  prefixo?: string
  sufixo?: string
  /** date / datetime-local */
  dataMin?: string
  dataMax?: string
  hoje?: string
  /** time / datetime-local: passo em minutos */
  passo?: number
}>()

const modelo = defineModel<string | number | boolean>({ default: '' })
const campo = computed(() => `campo-${props.id}`)
const idErro = computed(() => (props.erros?.length ? `erro-${props.id}` : undefined))
const idAjuda = computed(() => (props.ajuda ? `ajuda-${props.id}` : undefined))
const descrito = computed(() => [idErro.value, idAjuda.value].filter(Boolean).join(' ') || undefined)

// tipo password: botão de olho embutido; o estado vale só enquanto o campo está montado
const verSenha = ref(false)
const entrada = ref<HTMLInputElement | null>(null)
const tipoEntrada = computed(() => (props.tipo === 'password' && verSenha.value ? 'text' : (props.tipo ?? 'text')))

async function alternarSenha() {
  const el = entrada.value
  const ini = el?.selectionStart ?? null
  const fim = el?.selectionEnd ?? null
  verSenha.value = !verSenha.value
  await nextTick()
  el?.focus()
  if (el && ini !== null && fim !== null) {
    try { el.setSelectionRange(ini, fim) }
    catch { /* tipo sem seleção */ }
  }
}
</script>

<template>
  <div :class="tipo === 'checkbox' ? 'campo campo-check' : 'campo'">
    <template v-if="tipo === 'checkbox'">
      <input :id="campo" v-model="modelo" type="checkbox" :name="id" :aria-describedby="idErro" :aria-invalid="!!idErro" v-bind="$attrs">
      <label :for="campo">{{ label }}</label>
    </template>
    <template v-else>
      <label :for="campo">{{ label }}</label>
      <textarea v-if="tipo === 'textarea'" :id="campo" v-model="modelo as string" :name="id" :aria-describedby="idErro" :aria-invalid="!!idErro" v-bind="$attrs" />
      <UiSelect
        v-else-if="tipo === 'select'" :id="campo" v-model="modelo as string | number" :options="options ?? []"
        :label="label" :placeholder="placeholder" :erro="!!idErro"
      />
      <UiDatePicker
        v-else-if="tipo === 'date'" :id="campo" v-model="modelo as string" :label="label" :min="dataMin"
        :max="dataMax" :today="hoje" :placeholder="placeholder" :erro="!!idErro"
      />
      <UiTimePicker
        v-else-if="tipo === 'time'" :id="campo" v-model="modelo as string" :label="label" :step="passo"
        :placeholder="placeholder" :erro="!!idErro"
      />
      <UiDateTime
        v-else-if="tipo === 'datetime-local'" :id="campo" v-model="modelo as string" :label="label"
        :min="dataMin" :max="dataMax" :today="hoje" :step="passo" :erro="!!idErro"
      />
      <div v-else class="input-unidade" :class="{ 'com-prefixo': prefixo, 'com-sufixo': sufixo, 'senha-campo': tipo === 'password' }">
        <span v-if="prefixo" class="unidade unidade-pre" aria-hidden="true">{{ prefixo }}</span>
        <input ref="entrada" :id="campo" v-model="modelo" :type="tipoEntrada" :name="id" :aria-describedby="descrito" :aria-invalid="!!idErro" v-bind="$attrs">
        <span v-if="sufixo" class="unidade unidade-suf" aria-hidden="true">{{ sufixo }}</span>
        <button
          v-if="tipo === 'password'" type="button" class="senha-ver" :aria-pressed="verSenha"
          :aria-label="verSenha ? 'Ocultar senha' : 'Mostrar senha'" :aria-controls="campo" @click="alternarSenha"
        >
          <UiIcon :nome="verSenha ? 'olho-fechado' : 'olho'" :tamanho="22" />
        </button>
      </div>
    </template>
    <small v-if="ajuda" :id="idAjuda" class="ajuda">{{ ajuda }}</small>
    <span v-if="idErro" :id="idErro" role="alert">{{ erros?.join(' ') }}</span>
  </div>
</template>
