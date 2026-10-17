<script setup lang="ts">
defineProps<{ mensagem: string }>()
</script>

<template>
  <p role="alert">{{ mensagem }}</p>
</template>
