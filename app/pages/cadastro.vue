<script setup lang="ts">
import type { ApiError } from '~/composables/useApi'
import type { CadastroConfig } from '~/composables/useCadastro'

const api = useCadastroApi()

const { data: carga, refresh, status } = await useAsyncData('cadastro-config', async () => {
  try {
    return { config: await api.config() as CadastroConfig | undefined, erro: undefined as ApiError | undefined }
  }
  catch (e) {
    return { config: undefined, erro: e as ApiError }
  }
})

const config = computed(() => carga.value?.config)
const fechado = ref(false)

const form = reactive({
  nome_exibicao: '', telefone: '', slug: '', username: '', password: '', confirmar: '', aceite: false, website: '',
})
const erros = ref<Record<string, string[]>>({})
const erroGeral = ref('')
const enviando = ref(false)
const enviado = ref(false)
const verSenha = ref(false)
const resumo = reactive({ nome: '', slug: '', username: '' })
const titulo = ref<HTMLElement | null>(null)

// ---- normalização enquanto digita
watch(() => form.telefone, (v) => {
  const m = mascararTelefoneBR(v)
  if (m !== v) form.telefone = m
})
watch(() => form.username, (v) => {
  const n = normalizarUsuario(v)
  if (n !== v) form.username = n
})

// ---- slug: sugerido a partir do nome enquanto a pessoa não o editar
const slugManual = ref(false)
watch(() => form.nome_exibicao, (nome) => {
  if (!slugManual.value) form.slug = sugerirSlug(nome)
})
watch(() => form.slug, (v) => {
  const n = normalizarSlug(v)
  if (n !== v) form.slug = n
})
function aoDigitarSlug() {
  slugManual.value = form.slug !== ''
}
const slugFinal = computed(() => form.slug.replace(/-$/, ''))

type EstadoSlug = 'vazio' | 'invalido' | 'verificando' | 'disponivel' | 'reservado' | 'em_uso' | 'indisponivel' | 'erro'
const slugEstado = ref<EstadoSlug>('vazio')
let sequencia = 0
let temporizador: ReturnType<typeof setTimeout> | undefined
watch(slugFinal, (slug) => {
  clearTimeout(temporizador)
  const minha = ++sequencia
  if (!slug) {
    slugEstado.value = 'vazio'
    return
  }
  if (!slugValido(slug)) {
    slugEstado.value = 'invalido'
    return
  }
  slugEstado.value = 'verificando'
  temporizador = setTimeout(async () => {
    try {
      const r = await api.slug(slug)
      if (minha !== sequencia) return
      slugEstado.value = r.disponivel ? 'disponivel' : (r.motivo ?? 'indisponivel')
    }
    catch {
      if (minha === sequencia) slugEstado.value = 'erro'
    }
  }, 400)
})
onBeforeUnmount(() => clearTimeout(temporizador))

const MSG_SLUG: Record<EstadoSlug, string> = {
  vazio: '',
  invalido: 'Link inválido (3 a 40 letras minúsculas, números e hífen).',
  verificando: 'Verificando…',
  disponivel: 'Disponível',
  reservado: 'Este nome é reservado. Escolha outro.',
  em_uso: 'Indisponível: este link já está em uso.',
  indisponivel: 'Indisponível',
  erro: 'Não foi possível verificar agora. Vamos conferir ao enviar.',
}
const tomSlug = computed(() => {
  const s = slugEstado.value
  if (s === 'disponivel') return 'ok'
  if (s === 'invalido' || s === 'reservado' || s === 'em_uso' || s === 'indisponivel') return 'erro'
  return 'neutro'
})

// ---- senha
const dicas = computed(() => checarSenha(form.password, form.username))
const forca = computed(() => forcaSenha(form.password, form.username))

// ---- validade e texto auxiliar do botão
const digitosTel = computed(() => form.telefone.replace(/\D/g, ''))
const faltando = computed(() => {
  if (form.nome_exibicao.trim().length < 2) return 'Informe seu nome de exibição para continuar'
  if (digitosTel.value.length < 10) return 'Informe o WhatsApp com DDD para continuar'
  if (!slugValido(slugFinal.value)) return 'Escolha o link da sua agenda para continuar'
  if (slugEstado.value === 'verificando') return 'Verificando o link da agenda…'
  if (['reservado', 'em_uso', 'indisponivel', 'invalido'].includes(slugEstado.value)) return 'Escolha outro link de agenda para continuar'
  if (!usuarioValido(form.username)) return 'Informe um usuário de 3 a 30 caracteres para continuar'
  if (!dicas.value.tamanho || !dicas.value.naoNumerica || !dicas.value.diferenteUsuario) return 'Crie uma senha que siga as dicas para continuar'
  if (form.confirmar !== form.password) return 'Repita a mesma senha para continuar'
  if (!form.aceite) return 'Aceite os termos para enviar o cadastro'
  return ''
})
const podeEnviar = computed(() => !faltando.value && !!config.value)

const ORDEM_CAMPOS = ['nome_exibicao', 'telefone', 'slug', 'username', 'password', 'aceite_termos']
function limparErro(campo: string) {
  if (erros.value[campo]) erros.value = { ...erros.value, [campo]: [] }
}
const errosDe = (campo: string) => (erros.value[campo]?.length ? erros.value[campo] : undefined)
const descrito = (campo: string, extra?: string) => [errosDe(campo) ? `erro-${campo}` : '', extra].filter(Boolean).join(' ') || undefined

async function focarPrimeiroErro() {
  await nextTick()
  const primeiro = ORDEM_CAMPOS.find(c => errosDe(c))
  if (primeiro) document.getElementById(`campo-${primeiro}`)?.focus()
}

async function enviar() {
  if (enviando.value || !podeEnviar.value || !config.value) return
  enviando.value = true
  erroGeral.value = ''
  erros.value = {}
  try {
    await api.cadastrar({
      username: form.username,
      password: form.password,
      nome_exibicao: form.nome_exibicao.trim(),
      telefone: digitosTel.value,
      slug: slugFinal.value,
      aceite_termos: true,
      termos_versao: config.value.termos_versao,
      website: form.website,
    })
    resumo.nome = form.nome_exibicao.trim()
    resumo.slug = slugFinal.value
    resumo.username = form.username
    form.password = ''
    form.confirmar = ''
    enviado.value = true
    await nextTick()
    titulo.value?.focus()
  }
  catch (e) {
    await tratarErro(e as ApiError)
  }
  finally {
    enviando.value = false
  }
}

async function tratarErro(e: ApiError) {
  if (e.code === 'cadastro_fechado') {
    fechado.value = true
    return
  }
  if (e.status === 400 && e.fields) {
    erros.value = e.fields
    erroGeral.value = [e.fields.non_field_errors, e.fields.termos_versao, e.fields.website].filter(Boolean).flat().join(' ')
    if (e.fields.slug?.length) slugEstado.value = 'indisponivel'
    await focarPrimeiroErro()
    return
  }
  erroGeral.value = mensagemCadastro(e)
}

useHead({ title: 'Criar conta · Bela Agenda' })
</script>

<template>
  <main v-if="!config" class="pagina-publica pagina-estreita">
    <h1>Criar conta</h1>
    <div v-if="status === 'pending'" role="status" class="esqueletos">
      <p class="somente-leitor">Carregando…</p>
      <div v-for="n in 3" :key="n" class="esqueleto" aria-hidden="true" />
    </div>
    <div v-else class="estado-erro">
      <AvisoErro :mensagem="carga?.erro ? mensagemCadastro(carga.erro) : 'Não foi possível carregar o cadastro.'" />
      <p><button type="button" class="btn-secundario" @click="refresh()">Tentar de novo</button></p>
    </div>
  </main>

  <main v-else-if="fechado || !config.aberto" class="pagina-publica pagina-estreita">
    <UiEmpty
      icone="cadeado" titulo="Cadastro indisponível no momento"
      texto="As novas contas estão fechadas por enquanto. Fale com a equipe para entrar na lista."
    >
      <NuxtLink to="/entrar" class="btn btn-primario">Entrar</NuxtLink>
    </UiEmpty>
  </main>

  <main v-else-if="enviado" class="pagina-publica pagina-estreita">
    <section class="hero animar" data-status="confirmado">
      <div class="hero-selo" data-tom="sucesso">
        <svg class="hero-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path class="hero-check" d="M5 12.5l4.5 4.5L19 7.5" pathLength="100" />
        </svg>
      </div>
      <h1 ref="titulo" tabindex="-1">Cadastro enviado!</h1>
      <p class="hero-texto">
        Vamos analisar seus dados e avisar pelo WhatsApp quando sua conta for liberada.
        Você já pode entrar para acompanhar o status.
      </p>
    </section>
    <section class="cartao cad-resumo" aria-label="Resumo do cadastro">
      <dl class="det-lista">
        <div class="cad-item"><dt>Nome</dt><dd>{{ resumo.nome }}</dd></div>
        <div class="cad-item"><dt>Link da agenda</dt><dd>/p/{{ resumo.slug }}</dd></div>
        <div class="cad-item"><dt>Usuário</dt><dd>{{ resumo.username }}</dd></div>
      </dl>
    </section>
    <p><NuxtLink to="/entrar" class="btn btn-primario btn-grande">Entrar</NuxtLink></p>
  </main>

  <main v-else class="pagina-publica com-barra cad">
    <header class="cad-cab">
      <h1 ref="titulo" tabindex="-1">Crie sua conta</h1>
      <p class="passo-apoio">Sua conta será analisada antes de ser liberada.</p>
    </header>

    <form id="form-cadastro" novalidate @submit.prevent="enviar">
      <CampoForm
        id="nome_exibicao" v-model="form.nome_exibicao" label="Nome de exibição" autocomplete="name" maxlength="100"
        ajuda="Como suas clientes vão ver você. Ex.: Cálita Carvalho" :erros="errosDe('nome_exibicao')"
        @input="limparErro('nome_exibicao')"
      />
      <CampoForm
        id="telefone" v-model="form.telefone" tipo="tel" label="WhatsApp com DDD" inputmode="tel" autocomplete="tel-national"
        maxlength="16" placeholder="(15) 99999-9999" ajuda="Usamos para avisar quando sua conta for liberada."
        :erros="errosDe('telefone')" @input="limparErro('telefone')"
      />

      <div class="campo">
        <label for="campo-slug">Link da sua agenda</label>
        <div class="input-unidade com-prefixo">
          <span class="unidade unidade-pre" aria-hidden="true">/p/</span>
          <input
            id="campo-slug" v-model="form.slug" type="text" name="slug" autocomplete="off" autocapitalize="none"
            spellcheck="false" maxlength="40" placeholder="seu-nome" :aria-invalid="!!errosDe('slug') || tomSlug === 'erro'"
            :aria-describedby="descrito('slug', 'ajuda-slug estado-slug')" @input="aoDigitarSlug(); limparErro('slug')"
          >
        </div>
        <small id="ajuda-slug" class="ajuda">Este será o endereço que suas clientes usam para agendar.</small>
        <p id="estado-slug" class="slug-estado" :data-tom="tomSlug" role="status" aria-live="polite">{{ MSG_SLUG[slugEstado] }}</p>
        <span v-if="errosDe('slug')" id="erro-slug" role="alert">{{ errosDe('slug')?.join(' ') }}</span>
      </div>

      <CampoForm
        id="username" v-model="form.username" label="Usuário para entrar" autocomplete="username" autocapitalize="none"
        spellcheck="false" maxlength="30" ajuda="3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado."
        :erros="errosDe('username')" @input="limparErro('username')"
      />

      <div class="campo">
        <label for="campo-password">Senha</label>
        <div class="senha-campo">
          <input
            id="campo-password" v-model="form.password" :type="verSenha ? 'text' : 'password'" name="password"
            autocomplete="new-password" :aria-invalid="!!errosDe('password')" :aria-describedby="descrito('password', 'dicas-senha')"
            @input="limparErro('password')"
          >
          <button
            type="button" class="senha-ver" :aria-pressed="verSenha" :aria-label="verSenha ? 'Ocultar senha' : 'Mostrar senha'"
            @click="verSenha = !verSenha"
          >
            <UiIcon :nome="verSenha ? 'olho-fechado' : 'olho'" :tamanho="22" />
          </button>
        </div>
        <div id="dicas-senha" class="senha-dicas">
          <div class="senha-medidor" :data-nivel="forca" aria-hidden="true"><span /><span /><span /><span /></div>
          <p class="senha-forca">Força da senha: <strong>{{ ROTULO_FORCA[forca] || '—' }}</strong></p>
          <p class="senha-dica" :data-ok="dicas.tamanho">{{ dicas.tamanho ? '✓' : '○' }} Pelo menos 8 caracteres</p>
          <p class="senha-dica" :data-ok="dicas.naoNumerica">{{ dicas.naoNumerica ? '✓' : '○' }} Não pode ser só números</p>
          <p class="senha-dica" :data-ok="dicas.diferenteUsuario">{{ dicas.diferenteUsuario ? '✓' : '○' }} Diferente do usuário</p>
        </div>
        <span v-if="errosDe('password')" id="erro-password" role="alert">{{ errosDe('password')?.join(' ') }}</span>
      </div>

      <div class="campo">
        <label for="campo-confirmar">Confirmar senha</label>
        <div class="senha-campo">
          <input
            id="campo-confirmar" v-model="form.confirmar" :type="verSenha ? 'text' : 'password'" name="confirmar"
            autocomplete="new-password" :aria-invalid="form.confirmar !== '' && form.confirmar !== form.password"
            aria-describedby="estado-confirmar"
          >
          <button
            type="button" class="senha-ver" :aria-pressed="verSenha" :aria-label="verSenha ? 'Ocultar senha' : 'Mostrar senha'"
            @click="verSenha = !verSenha"
          >
            <UiIcon :nome="verSenha ? 'olho-fechado' : 'olho'" :tamanho="22" />
          </button>
        </div>
        <p id="estado-confirmar" class="slug-estado" :data-tom="form.confirmar && form.confirmar === form.password ? 'ok' : (form.confirmar ? 'erro' : 'neutro')" role="status" aria-live="polite">
          {{ form.confirmar ? (form.confirmar === form.password ? 'As senhas conferem' : 'As senhas não são iguais') : '' }}
        </p>
      </div>

      <!-- Campo-isca: deve ir vazio. Oculto, fora da ordem de tabulação. -->
      <div hidden aria-hidden="true">
        <label for="campo-website">Website</label>
        <input id="campo-website" v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off">
      </div>

      <div class="campo campo-check">
        <input
          id="campo-aceite_termos" v-model="form.aceite" type="checkbox" name="aceite_termos"
          :aria-invalid="!!errosDe('aceite_termos')" :aria-describedby="descrito('aceite_termos')" @change="limparErro('aceite_termos')"
        >
        <label for="campo-aceite_termos">
          Li e aceito os
          <a href="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</a>
          e a
          <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.
        </label>
        <span v-if="errosDe('aceite_termos')" id="erro-aceite_termos" role="alert">{{ errosDe('aceite_termos')?.join(' ') }}</span>
      </div>
    </form>

    <div class="barra-acao">
      <div class="barra-conteudo">
        <AvisoErro v-if="erroGeral" :mensagem="erroGeral" class="barra-erro" />
        <p v-else-if="faltando" id="cad-ajuda" class="barra-ajuda">{{ faltando }}</p>
        <div class="barra-botoes">
          <button
            type="submit" form="form-cadastro" class="barra-primario" :disabled="!podeEnviar || enviando"
            :aria-busy="enviando || undefined" :aria-describedby="faltando && !erroGeral ? 'cad-ajuda' : undefined"
          >
            {{ enviando ? 'Enviando…' : 'Enviar cadastro' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
