<script setup lang="ts">
const { versao } = await useVersaoTermos()
useHead({ title: 'Termos de Uso · Bela Agenda' })
</script>

<template>
  <DocumentoLegal titulo="Termos de Uso" :secoes="TERMOS" :versao="versao" />
</template>
