<script setup lang="ts">
// TEMPORÁRIO: remover antes de produção.
const { request } = useApi()
const resultado = ref('')
const carregando = ref(false)

async function verificar() {
  carregando.value = true
  try {
    resultado.value = JSON.stringify(await request('/saude/'), null, 2)
  }
  catch (e) {
    resultado.value = 'ERRO: ' + JSON.stringify(e, null, 2)
  }
  finally {
    carregando.value = false
  }
}
</script>

<template>
  <main class="pagina-estreita">
    <section class="cartao">
      <h1>Diagnóstico</h1>
      <p class="aviso">Página temporária. Remover antes de produção.</p>
      <p><button type="button" :disabled="carregando" @click="verificar">Chamar /api/v1/saude/</button></p>
      <pre aria-live="polite">{{ resultado }}</pre>
    </section>
  </main>
</template>
