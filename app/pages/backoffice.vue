<script setup lang="ts">
definePageMeta({ middleware: 'backoffice' })

const { sessao, sair } = useSessao()
const superuser = computed(() => sessao.value?.is_superuser === true)
const nome = computed(() => sessao.value?.username ?? '')

const saindo = ref(false)
async function deslogar() {
  if (saindo.value) return
  saindo.value = true
  try {
    await sair()
  }
  catch { /* sessão já inválida: segue para o login */ }
  finally {
    saindo.value = false
  }
  await navigateTo('/entrar')
}

const itensPerfil = [{ id: 'sair', label: 'Sair' }]
function aoEscolher(id: string) {
  if (id === 'sair') void deslogar()
}

useHead({ title: 'Backoffice · Bela Agenda', meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <div v-if="sessao" class="painel backoffice">
    <header class="painel-topo">
      <p class="marca">Bela Agenda · Backoffice</p>
      <UiMenu
        label="Perfil" :aria-label="`Perfil: ${nome}`" :title="nome" :items="itensPerfil" align="right"
        button-class="perfil-botao" @select="aoEscolher"
      >
        <template #botao="{ aberto }">
          <span class="avatar-circulo" aria-hidden="true">{{ iniciaisDe(nome) }}</span>
          <span class="perfil-nome" aria-hidden="true">{{ nome }}</span>
          <UiIcon nome="chevron-baixo" :tamanho="22" class="perfil-chevron" :class="{ girado: aberto }" />
        </template>
      </UiMenu>
    </header>

    <main v-if="superuser" class="bo-main">
      <NuxtPage />
    </main>

    <main v-else class="pagina-estreita">
      <UiEmpty icone="lupa" titulo="Página não encontrada" texto="Verifique se o endereço está correto.">
        <NuxtLink :to="sessao.profissional ? '/painel' : '/entrar'" class="btn btn-secundario">
          {{ sessao.profissional ? 'Ir para o painel' : 'Entrar' }}
        </NuxtLink>
      </UiEmpty>
    </main>
  </div>
</template>
