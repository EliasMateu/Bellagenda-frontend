<script setup lang="ts">
const { versao } = await useVersaoTermos()
useHead({ title: 'Política de Privacidade · Bela Agenda' })
</script>

<template>
  <DocumentoLegal titulo="Política de Privacidade" :secoes="PRIVACIDADE" :versao="versao" />
</template>
