<script setup lang="ts">
definePageMeta({ middleware: 'painel' })

const { sessao, sair } = useSessao()
const { configuracao } = useConfiguracao()
const api = usePainelApi()
const origem = useRequestURL().origin
const route = useRoute()

const ativa = computed(() => sessao.value?.profissional?.status === 'ativa')
const slug = computed(() => sessao.value?.profissional?.slug ?? '')
const linkPublico = computed(() => `${origem}/p/${encodeURIComponent(slug.value)}`)

// O fuso da profissional vem da configuração; só chama o painel se a conta estiver ativa (senão dá 403).
if (ativa.value && !configuracao.value) {
  await useAsyncData('painel-configuracao', async () => {
    try {
      configuracao.value = await api.configuracao.obter()
    }
    catch { /* as telas tratam seus próprios erros */ }
    return null
  })
}

const MENSAGENS: Record<string, { titulo: string, texto: string }> = {
  pendente: { titulo: 'Aguardando aprovação', texto: 'Sua conta foi criada e está aguardando aprovação. Você poderá usar o painel quando ela for ativada.' },
  suspensa: { titulo: 'Conta suspensa', texto: 'Sua conta está suspensa. Entre em contato com a administração.' },
  rejeitada: { titulo: 'Conta rejeitada', texto: 'Sua conta não foi aprovada. Entre em contato com a administração.' },
}
const mensagem = computed(() => MENSAGENS[sessao.value?.profissional?.status ?? ''] ?? MENSAGENS.pendente!)

const copiado = ref(false)
async function copiar() {
  try {
    await navigator.clipboard.writeText(linkPublico.value)
    copiado.value = true
  }
  catch {
    copiado.value = false
  }
}

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

// Menu "Mais" da navegação inferior (mobile): fecha ao navegar.
const mais = ref<HTMLDetailsElement | null>(null)
watch(() => route.fullPath, () => {
  if (mais.value) mais.value.open = false
})
</script>

<template>
  <div v-if="sessao" class="painel">
    <header class="painel-topo">
      <p class="marca">Bela Agenda</p>
      <nav v-if="ativa" class="nav-topo" aria-label="Painel">
        <NuxtLink to="/painel">Agenda</NuxtLink>
        <NuxtLink to="/painel/servicos">Serviços</NuxtLink>
        <NuxtLink to="/painel/horarios">Horários</NuxtLink>
        <NuxtLink to="/painel/bloqueios">Bloqueios</NuxtLink>
        <NuxtLink to="/painel/clientes">Clientes</NuxtLink>
        <NuxtLink to="/painel/configuracao">Configurações</NuxtLink>
      </nav>
      <div class="usuario">
        <p>Conectada como {{ sessao.profissional?.nome_exibicao ?? sessao.username }}</p>
        <button type="button" class="btn-secundario" :disabled="saindo" @click="deslogar">Sair</button>
      </div>
    </header>

    <main v-if="!sessao.profissional" class="pagina-estreita">
      <section class="cartao">
        <h1>Sem perfil de profissional</h1>
        <p class="aviso">Este usuário não tem perfil de profissional. O backoffice da plataforma é feito pelo admin do Django.</p>
      </section>
    </main>

    <main v-else-if="!ativa" class="pagina-estreita">
      <section class="cartao">
        <h1>{{ mensagem.titulo }}</h1>
        <p class="aviso">{{ mensagem.texto }}</p>
      </section>
    </main>

    <template v-else>
      <main class="painel-main">
        <p class="link-publico">
          <span>Seu link de agendamento:</span>
          <a :href="`/p/${encodeURIComponent(slug)}`" target="_blank" rel="noopener">{{ linkPublico }}</a>
          <button type="button" class="btn-secundario" @click="copiar">Copiar link</button>
          <span v-if="copiado" role="status">Copiado.</span>
        </p>
        <NuxtPage />
      </main>

      <nav class="nav-inferior" aria-label="Painel (menu inferior)">
        <NuxtLink to="/painel">Agenda</NuxtLink>
        <NuxtLink to="/painel/servicos">Serviços</NuxtLink>
        <NuxtLink to="/painel/horarios">Horários</NuxtLink>
        <details ref="mais" class="mais">
          <summary>Mais</summary>
          <div class="mais-menu">
            <NuxtLink to="/painel/bloqueios">Bloqueios</NuxtLink>
            <NuxtLink to="/painel/clientes">Clientes</NuxtLink>
            <NuxtLink to="/painel/configuracao">Configurações</NuxtLink>
          </div>
        </details>
      </nav>
    </template>
  </div>
</template>
