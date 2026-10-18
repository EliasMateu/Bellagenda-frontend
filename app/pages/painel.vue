<script setup lang="ts">
definePageMeta({ middleware: 'painel' })

const { sessao, sair } = useSessao()
const { configuracao } = useConfiguracao()
const api = usePainelApi()
const route = useRoute()
const linkPublico = useLinkPublico()

const ativa = computed(() => sessao.value?.profissional?.status === 'ativa')
const nome = computed(() => sessao.value?.profissional?.nome_exibicao ?? sessao.value?.username ?? '')
const palavras = computed(() => nome.value.trim().split(/\s+/).filter(Boolean))
const iniciais = computed(() => palavras.value.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '?')
const primeiroNome = computed(() => palavras.value[0] ?? '')

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

const itensPerfil = computed(() => [
  ...(ativa.value
    ? [
        { id: 'clientes', label: 'Clientes' },
        { id: 'bloqueios', label: 'Bloqueios' },
        { id: 'configuracao', label: 'Configurações' },
        { id: 'copiar', label: 'Copiar link de agendamento' },
      ]
    : []),
  { id: 'sair', label: 'Sair' },
])

function aoEscolher(id: string) {
  if (id === 'sair') void deslogar()
  else if (id === 'copiar') void linkPublico.copiar()
  else void navigateTo(`/painel/${id}`)
}

// Barra inferior: "Mais" abre uma folha com o restante da navegação.
const maisAberto = ref(false)
const secoesMais = ['/painel/bloqueios', '/painel/clientes', '/painel/configuracao']
const maisAtivo = computed(() => secoesMais.some(p => route.path.startsWith(p)))
watch(() => route.fullPath, () => {
  maisAberto.value = false
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
      <UiMenu
        label="Perfil" :aria-label="`Perfil: ${nome}`" :title="nome" :items="itensPerfil" align="right"
        button-class="perfil-botao" @select="aoEscolher"
      >
        <template #botao="{ aberto }">
          <span class="avatar-circulo" aria-hidden="true">{{ iniciais }}</span>
          <span class="perfil-nome" aria-hidden="true">{{ primeiroNome }}</span>
          <UiIcon nome="chevron-baixo" :tamanho="22" class="perfil-chevron" :class="{ girado: aberto }" />
        </template>
      </UiMenu>
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
        <NuxtPage />
      </main>

      <nav class="nav-inferior" aria-label="Painel (menu inferior)">
        <NuxtLink to="/painel" exact-active-class="ativo">
          <UiIcon nome="calendario" /> <span>Agenda</span>
        </NuxtLink>
        <NuxtLink to="/painel/servicos" active-class="ativo">
          <UiIcon nome="servicos" /> <span>Serviços</span>
        </NuxtLink>
        <NuxtLink to="/painel/horarios" active-class="ativo">
          <UiIcon nome="horarios" /> <span>Horários</span>
        </NuxtLink>
        <button
          type="button" class="nav-mais" :class="{ ativo: maisAtivo }" aria-haspopup="dialog"
          :aria-expanded="maisAberto" :aria-current="maisAtivo ? 'page' : undefined" @click="maisAberto = true"
        >
          <UiIcon nome="mais-opcoes" /> <span>Mais</span>
        </button>
      </nav>

      <UiSheet v-model="maisAberto" titulo="Mais opções">
        <p class="sheet-conta"><UiIcon nome="usuario" /> {{ nome }}</p>
        <nav aria-label="Mais opções do painel" class="lista-links">
          <NuxtLink to="/painel/bloqueios">Bloqueios</NuxtLink>
          <NuxtLink to="/painel/clientes">Clientes</NuxtLink>
          <NuxtLink to="/painel/configuracao">Configurações</NuxtLink>
        </nav>
        <p class="acoes">
          <button type="button" class="btn-secundario" @click="linkPublico.copiar">
            <UiIcon :nome="linkPublico.copiado.value ? 'check' : 'copiar'" :tamanho="20" />
            {{ linkPublico.copiado.value ? 'Copiado' : 'Copiar link de agendamento' }}
          </button>
          <button type="button" class="btn-secundario" :disabled="saindo" @click="deslogar">Sair</button>
        </p>
      </UiSheet>
    </template>

    <p v-if="linkPublico.copiado.value" class="toast" role="status">Link copiado.</p>
  </div>
</template>
