<script setup lang="ts">
import type { ApiError } from '~/composables/useApi'
import type { AcaoConta, ContaBackoffice, StatusConta } from '~/composables/useBackoffice'

type Filtro = StatusConta | 'todas'
type Modo = 'detalhes' | AcaoConta

const api = useBackofficeApi()
const { expirou } = useSessao()
const origem = useRequestURL().origin

const filtro = ref<Filtro>('pendente')
const busca = ref('')
const contas = ref<ContaBackoffice[]>([])
const contagens = ref<Record<StatusConta, number> | null>(null)
const carregando = ref(false)
const carregou = ref(false)
const erroLista = ref('')

const mensagem = ref('')
const tomMensagem = ref<'ok' | 'aviso'>('ok')
let relogioMsg: ReturnType<typeof setTimeout> | undefined
function avisar(texto: string, tom: 'ok' | 'aviso' = 'ok') {
  mensagem.value = texto
  tomMensagem.value = tom
  clearTimeout(relogioMsg)
  relogioMsg = setTimeout(() => (mensagem.value = ''), 7000)
}

const FILTROS: { valor: Filtro, rotulo: string, status?: StatusConta }[] = [
  { valor: 'pendente', rotulo: 'Pendentes', status: 'pendente' },
  { valor: 'ativa', rotulo: 'Ativas', status: 'ativa' },
  { valor: 'suspensa', rotulo: 'Suspensas', status: 'suspensa' },
  { valor: 'rejeitada', rotulo: 'Rejeitadas', status: 'rejeitada' },
  { valor: 'todas', rotulo: 'Todas' },
]
const rotuloFiltro = (f: (typeof FILTROS)[number]) => (f.status && contagens.value ? `${f.rotulo} (${contagens.value[f.status]})` : f.rotulo)
const pendentes = computed(() => contagens.value?.pendente ?? 0)

// ---------------------------------------------------------------- carga da lista
let sequencia = 0
async function carregar(silencioso = false) {
  const minha = ++sequencia
  if (!silencioso) carregando.value = true
  erroLista.value = ''
  try {
    const r = await api.contas({ status: filtro.value === 'todas' ? undefined : filtro.value, q: busca.value.trim() || undefined })
    if (minha !== sequencia) return
    contas.value = r.resultados
    contagens.value = r.contagens
  }
  catch (e) {
    if (minha !== sequencia) return
    const err = e as ApiError
    if (err.status === 401 || err.code === 'nao_autenticado') {
      await expirou()
      return
    }
    erroLista.value = mensagemErro(err)
  }
  finally {
    if (minha === sequencia) {
      carregando.value = false
      carregou.value = true
    }
  }
}

watch(filtro, () => carregar())
let temporizador: ReturnType<typeof setTimeout> | undefined
watch(busca, () => {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => carregar(), 300)
})
function buscarAgora() {
  clearTimeout(temporizador)
  void carregar()
}
onMounted(() => carregar())
onBeforeUnmount(() => {
  clearTimeout(temporizador)
  clearTimeout(relogioMsg)
})

// ---------------------------------------------------------------- folha de detalhes / ação
const alvo = ref<ContaBackoffice | null>(null)
const modo = ref<Modo>('detalhes')
const motivo = ref('')
const erroMotivo = ref('')
const confirmando = ref(false)
const enviandoAcao = ref(false)
const erroAcao = ref('')
const copiado = ref(false)

const folha = computed({
  get: () => alvo.value !== null,
  set: (v: boolean) => {
    if (!v) alvo.value = null
  },
})

function abrir(c: ContaBackoffice, m: Modo) {
  alvo.value = c
  modo.value = m
  motivo.value = ''
  erroMotivo.value = ''
  confirmando.value = false
  erroAcao.value = ''
  copiado.value = false
}

const precisaMotivo = computed(() => modo.value === 'rejeitar' || modo.value === 'suspender')
const TITULO_FOLHA: Record<Modo, string> = {
  detalhes: 'Detalhes da conta', aprovar: 'Aprovar conta', rejeitar: 'Rejeitar conta', suspender: 'Suspender conta', reativar: 'Reativar conta',
}
const PERGUNTA: Record<AcaoConta, string> = {
  aprovar: 'Aprovar esta conta? Ela poderá usar o painel.',
  reativar: 'Reativar esta conta? Ela volta a usar o painel.',
  rejeitar: 'Rejeitar esta conta? Ela não será liberada.',
  suspender: 'Suspender esta conta? Ela deixa de usar o painel.',
}
const CONFIRMAR: Record<AcaoConta, string> = {
  aprovar: 'Sim, aprovar', reativar: 'Sim, reativar', rejeitar: 'Sim, rejeitar', suspender: 'Sim, suspender',
}
const FEITO: Record<AcaoConta, string> = {
  aprovar: 'Conta aprovada.', rejeitar: 'Conta rejeitada.', suspender: 'Conta suspensa.', reativar: 'Conta reativada.',
}

async function continuarMotivo() {
  if (motivo.value.trim().length < 3) {
    erroMotivo.value = 'Informe o motivo (mínimo de 3 caracteres).'
    await nextTick()
    document.getElementById('campo-motivo')?.focus()
    return
  }
  erroMotivo.value = ''
  confirmando.value = true
}

async function executar() {
  const c = alvo.value
  if (!c || modo.value === 'detalhes' || enviandoAcao.value) return
  const acao = modo.value
  enviandoAcao.value = true
  erroAcao.value = ''
  try {
    await api.acao(c.id, acao, precisaMotivo.value ? motivo.value.trim() : undefined)
    alvo.value = null
    avisar(FEITO[acao])
    await carregar(true)
  }
  catch (e) {
    const err = e as ApiError
    if (err.status === 401 || err.code === 'nao_autenticado') {
      await expirou()
    }
    else if (err.status === 400 && err.fields?.motivo?.length) {
      erroMotivo.value = err.fields.motivo.join(' ')
      confirmando.value = false
      await nextTick()
      document.getElementById('campo-motivo')?.focus()
    }
    else if (err.code === 'transicao_invalida' || err.status === 409) {
      alvo.value = null
      avisar('A situação desta conta mudou. A lista foi atualizada.', 'aviso')
      await carregar(true)
    }
    else if (err.status === 404) {
      alvo.value = null
      avisar('Conta não encontrada. A lista foi atualizada.', 'aviso')
      await carregar(true)
    }
    else {
      erroAcao.value = mensagemErro(err)
    }
  }
  finally {
    enviandoAcao.value = false
  }
}

async function copiarLink(c: ContaBackoffice) {
  try {
    await navigator.clipboard.writeText(`${origem}/p/${encodeURIComponent(c.slug)}`)
    copiado.value = true
    setTimeout(() => (copiado.value = false), 3000)
  }
  catch {
    copiado.value = false
  }
}

const vazio = computed(() => {
  if (busca.value.trim()) return { icone: 'lupa' as const, titulo: 'Nenhuma conta encontrada', texto: 'Tente outro nome, usuário, link ou telefone.' }
  if (filtro.value === 'pendente') {
    return { icone: 'escudo-check' as const, titulo: 'Nenhuma conta pendente', texto: 'Quando alguém se cadastrar, a conta aparece aqui para você analisar.' }
  }
  if (filtro.value === 'todas') return { icone: 'usuario' as const, titulo: 'Nenhuma conta ainda', texto: 'Os cadastros aparecem aqui.' }
  return { icone: 'usuario' as const, titulo: 'Nenhuma conta nesta situação', texto: 'Escolha outra situação para ver mais contas.' }
})
</script>

<template>
  <section class="gestao">
    <div class="gestao-topo">
      <h1>Contas</h1>
    </div>

    <div class="bo-filtros" role="group" aria-label="Situação da conta">
      <button
        v-for="f in FILTROS" :key="f.valor" type="button" class="bo-filtro" :aria-pressed="filtro === f.valor"
        :data-destaque="f.valor === 'pendente' && pendentes > 0 ? '' : undefined" @click="filtro = f.valor"
      >
        {{ rotuloFiltro(f) }}
      </button>
    </div>

    <UiSearchField v-model="busca" label="Buscar por nome, usuário, link ou telefone" placeholder="Buscar por nome, usuário, link ou telefone" @enviar="buscarAgora" />

    <p class="bo-msg" :data-tom="tomMensagem" role="status" aria-live="polite">{{ mensagem }}</p>

    <div v-if="!carregou && !erroLista" role="status" class="esqueletos">
      <p class="somente-leitor">Carregando…</p>
      <div v-for="n in 3" :key="n" class="esqueleto esqueleto-conta" aria-hidden="true" />
    </div>

    <div v-else-if="erroLista && !contas.length" class="estado-erro">
      <AvisoErro :mensagem="erroLista" />
      <p><button type="button" class="btn-secundario" @click="carregar()">Tentar de novo</button></p>
    </div>

    <UiEmpty v-else-if="!contas.length" :icone="vazio.icone" :titulo="vazio.titulo" :texto="vazio.texto" />

    <template v-else>
      <AvisoErro v-if="erroLista" :mensagem="erroLista" />
      <ul class="grade-gestao" :aria-busy="carregando || undefined">
        <ContaCartao
          v-for="c in contas" :key="c.id" :conta="c" @acao="a => abrir(c, a)" @detalhes="abrir(c, 'detalhes')"
        />
      </ul>
    </template>

    <UiSheet v-model="folha" :titulo="TITULO_FOLHA[modo]">
      <template v-if="alvo">
        <!-- detalhes -->
        <template v-if="modo === 'detalhes'">
          <dl class="bo-detalhes">
            <div><dt>Nome de exibição</dt><dd>{{ alvo.nome_exibicao }}</dd></div>
            <div><dt>Usuário</dt><dd>@{{ alvo.username }}</dd></div>
            <div>
              <dt>Link da agenda</dt>
              <dd class="bo-link">
                <span>/p/{{ alvo.slug }}</span>
                <button type="button" class="btn-secundario" @click="copiarLink(alvo)">
                  <UiIcon :nome="copiado ? 'check' : 'copiar'" :tamanho="18" />{{ copiado ? 'Copiado' : 'Copiar' }}
                </button>
              </dd>
            </div>
            <div><dt>Telefone</dt><dd>{{ alvo.telefone ? formatarTelefoneBR(alvo.telefone) : '—' }}</dd></div>
            <div>
              <dt>Situação</dt>
              <dd><span class="distintivo-status" :data-status="alvo.status">{{ ROTULO_STATUS[alvo.status] }}</span></dd>
            </div>
            <div><dt>Cadastrada em</dt><dd>{{ dataHoraSP(alvo.cadastrado_em) }}</dd></div>
            <div>
              <dt>Aceite dos termos</dt>
              <dd>{{ alvo.termos_aceitos_em ? `Versão ${alvo.termos_versao}, em ${dataHoraSP(alvo.termos_aceitos_em)}` : 'Sem registro' }}</dd>
            </div>
            <div>
              <dt>Aprovada por</dt>
              <dd>{{ alvo.aprovado_por ? `@${alvo.aprovado_por}, em ${dataHoraSP(alvo.aprovado_em)}` : '—' }}</dd>
            </div>
            <div><dt>Motivo</dt><dd>{{ alvo.motivo_status || '—' }}</dd></div>
          </dl>
          <p class="acoes acoes-folha">
            <a
              v-if="alvo.telefone" :href="linkWhatsAppConta(alvo)" class="btn btn-secundario" target="_blank" rel="noopener noreferrer"
            ><UiIcon nome="whatsapp" :tamanho="20" />WhatsApp</a>
            <button
              v-for="a in ACOES_CONTA[alvo.status]" :key="a" type="button"
              :class="a === 'aprovar' || a === 'reativar' ? 'btn-primario' : (a === 'rejeitar' ? 'btn-perigo' : 'btn-secundario')"
              @click="abrir(alvo, a)"
            >
              {{ ROTULO_ACAO[a] }}
            </button>
          </p>
        </template>

        <!-- ações -->
        <template v-else>
          <p class="bo-alvo"><strong>{{ alvo.nome_exibicao }}</strong> · @{{ alvo.username }}</p>
          <AvisoErro v-if="erroAcao" :mensagem="erroAcao" />

          <form v-if="precisaMotivo && !confirmando" @submit.prevent="continuarMotivo">
            <CampoForm
              id="motivo" v-model="motivo" tipo="textarea" label="Motivo" required maxlength="500" data-autofocus
              ajuda="Obrigatório, mínimo de 3 caracteres. Fica registrado na conta." :erros="erroMotivo ? [erroMotivo] : undefined"
            />
            <p class="acoes acoes-folha">
              <button type="button" class="btn-secundario" @click="abrir(alvo, 'detalhes')">Cancelar</button>
              <button type="submit">Continuar</button>
            </p>
          </form>

          <ConfirmarAcao
            v-else :key="`${alvo.id}-${modo}`" :pergunta="PERGUNTA[modo]" :rotulo="CONFIRMAR[modo]"
            :tom="modo === 'aprovar' || modo === 'reativar' ? 'primario' : 'perigo'" :enviando="enviandoAcao"
            @voltar="precisaMotivo ? (confirmando = false) : abrir(alvo, 'detalhes')" @confirmar="executar"
          />
        </template>
      </template>
    </UiSheet>
  </section>
</template>
