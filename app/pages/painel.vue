<script setup lang="ts">
definePageMeta({ middleware: 'painel' })

const { sessao, sair } = useSessao()
const { configuracao } = useConfiguracao()
const api = usePainelApi()
const origem = useRequestURL().origin

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
</script>

<template>
  <div v-if="sessao">
    <header>
      <p>Conectada como {{ sessao.profissional?.nome_exibicao ?? sessao.username }}</p>
      <button type="button" :disabled="saindo" @click="deslogar">Sair</button>
    </header>

    <main v-if="!sessao.profissional">
      <h1>Sem perfil de profissional</h1>
      <p>Este usuário não tem perfil de profissional. O backoffice da plataforma é feito pelo admin do Django.</p>
    </main>

    <main v-else-if="!ativa">
      <h1>{{ mensagem.titulo }}</h1>
      <p>{{ mensagem.texto }}</p>
    </main>

    <template v-else>
      <nav aria-label="Painel">
        <ul>
          <li><NuxtLink to="/painel">Agenda</NuxtLink></li>
          <li><NuxtLink to="/painel/servicos">Serviços</NuxtLink></li>
          <li><NuxtLink to="/painel/horarios">Horários</NuxtLink></li>
          <li><NuxtLink to="/painel/bloqueios">Bloqueios</NuxtLink></li>
          <li><NuxtLink to="/painel/clientes">Clientes</NuxtLink></li>
          <li><NuxtLink to="/painel/configuracao">Configurações</NuxtLink></li>
        </ul>
        <p>
          Seu link de agendamento:
          <a :href="`/p/${encodeURIComponent(slug)}`" target="_blank" rel="noopener">{{ linkPublico }}</a>
          <button type="button" @click="copiar">Copiar link</button>
          <span v-if="copiado" role="status">Copiado.</span>
        </p>
      </nav>
      <main>
        <NuxtPage />
      </main>
    </template>
  </div>
</template>
