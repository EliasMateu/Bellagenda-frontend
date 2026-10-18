<script setup lang="ts">
defineProps<{
  servico: string
  profissional: string
  inicio: string
  preco?: string
  codigo?: string
  status?: string
}>()
</script>

<template>
  <dl>
    <dt>Serviço</dt>
    <dd>{{ servico }}</dd>
    <dt>Profissional</dt>
    <dd>{{ profissional }}</dd>
    <dt>Data</dt>
    <dd>{{ formatarIso(inicio).data }}</dd>
    <dt>Horário</dt>
    <dd>{{ formatarIso(inicio).hora }}</dd>
    <template v-if="preco">
      <dt>Preço</dt>
      <dd>{{ formatarPreco(preco) }}</dd>
    </template>
    <template v-if="codigo">
      <dt>Código</dt>
      <dd>{{ codigo }}</dd>
    </template>
    <template v-if="status">
      <dt>Situação</dt>
      <dd><span class="distintivo-status" :data-status="status">{{ rotuloStatus(status) }}</span></dd>
    </template>
  </dl>
</template>
