<script setup lang="ts">
const { entrar } = useSessao()
const { enviando, erro, erros, executar } = useEnvio()
const form = reactive({ username: '', password: '' })

async function enviar() {
  const ok = await executar(async () => {
    await entrar(form.username.trim(), form.password)
    return true
  })
  if (ok) await navigateTo('/painel')
}
</script>

<template>
  <main>
    <h1>Entrar</h1>
    <form @submit.prevent="enviar">
      <AvisoErro v-if="erro" :mensagem="erro" />
      <CampoForm id="username" v-model="form.username" label="Usuário" autocomplete="username" required :erros="erros.username" />
      <CampoForm id="password" v-model="form.password" tipo="password" label="Senha" autocomplete="current-password" required :erros="erros.password" />
      <button type="submit" :disabled="enviando">{{ enviando ? 'Entrando…' : 'Entrar' }}</button>
    </form>
  </main>
</template>
