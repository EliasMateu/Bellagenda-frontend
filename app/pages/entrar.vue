<script setup lang="ts">
const { entrar, sessao } = useSessao()
const cadastro = useCadastroApi()
const { enviando, erro, erros, executar } = useEnvio()
const form = reactive({ username: '', password: '' })

// O link de cadastro só aparece com o cadastro aberto; qualquer falha na consulta o esconde.
const { data: cadastroAberto } = await useAsyncData('entrar-cadastro-config', async () => {
  try {
    return (await cadastro.config()).aberto
  }
  catch {
    return false
  }
})

async function enviar() {
  const ok = await executar(async () => {
    await entrar(form.username.trim(), form.password)
    return true
  })
  if (ok) await navigateTo(sessao.value?.is_superuser ? '/backoffice' : '/painel')
}
</script>

<template>
  <main class="pagina-estreita">
    <form class="cartao" @submit.prevent="enviar">
      <h1>Entrar</h1>
      <AvisoErro v-if="erro" :mensagem="erro" />
      <CampoForm id="username" v-model="form.username" label="Usuário" autocomplete="username" required :erros="erros.username" />
      <CampoForm id="password" v-model="form.password" tipo="password" label="Senha" autocomplete="current-password" required :erros="erros.password" />
      <button type="submit" class="botao-largo" :disabled="enviando">{{ enviando ? 'Entrando…' : 'Entrar' }}</button>
      <p v-if="cadastroAberto" class="entrar-cadastro">Ainda não tem conta? <NuxtLink to="/cadastro">Cadastre-se</NuxtLink></p>
    </form>
  </main>
</template>
