<script setup lang="ts">
import type { AgendamentoConsultado, HorariosResposta, Servico, ServicosResposta } from '~/composables/usePublico'
import type { ApiError } from '~/composables/useApi'

type Passo = 'servico' | 'data' | 'horario' | 'dados' | 'revisao'

const slug = String(useRoute().params.slug)
const api = usePublico(slug)
const locais = useAgendamentosLocais(slug)

const { data: carga, status, refresh } = await useAsyncData(`servicos-${slug}`, async () => {
  try {
    return { dados: await api.servicos() as ServicosResposta | undefined, erro: undefined as ApiError | undefined }
  }
  catch (e) {
    return { dados: undefined, erro: e as ApiError }
  }
})

const passo = ref<Passo>('servico')
const titulo = ref<HTMLElement | null>(null)
const hoje = ref('')
const servicoId = ref<number | null>(null)
const data = ref('')
const horarios = ref<HorariosResposta | null>(null)
const inicio = ref('')
const sugestoes = ref<string[]>([])
const form = reactive({ nome: '', telefone: '', observacao: '', consentimento: false, website: '' })
const erros = ref<Record<string, string[]>>({})
const erroGeral = ref('')
const carregando = ref(false)
const enviando = ref(false)
const meus = ref<{ token: string, ag: AgendamentoConsultado }[]>([])

const servicos = computed<Servico[]>(() => carga.value?.dados?.servicos ?? [])
const profissional = computed(() => carga.value?.dados?.nome_exibicao ?? '')
const whatsappPublico = computed(() => {
  const tel = carga.value?.dados?.profissional_telefone?.replace(/\D/g, '')
  return tel ? `https://wa.me/${tel}` : ''
})
const servico = computed(() => servicos.value.find(s => s.id === servicoId.value))
const titulos: Record<Passo, string> = {
  servico: 'Escolha o serviço',
  data: 'Escolha a data',
  horario: 'Escolha o horário',
  dados: 'Seus dados',
  revisao: 'Revise e confirme',
}

onMounted(() => {
  const d = new Date()
  hoje.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  void carregarMeus()
})

const TERMINAIS = ['concluido', 'falta', 'cancelado_cliente', 'cancelado_salao']

// Agendamentos feitos neste aparelho: consulta cada token e descarta os inexistentes ou já encerrados.
async function carregarMeus() {
  const vivos: { token: string, ag: AgendamentoConsultado }[] = []
  for (const g of locais.ler()) {
    try {
      const ag = await api.consultar({ token: g.token })
      if (TERMINAIS.includes(ag.status) || new Date(ag.fim).getTime() <= Date.now()) locais.remover(g.token)
      else vivos.push({ token: g.token, ag })
    }
    catch (e) {
      if ((e as ApiError).status === 404) locais.remover(g.token)
    }
  }
  meus.value = vivos.sort((a, b) => a.ag.inicio.localeCompare(b.ag.inicio))
}

const linkMeu = (token: string) => `/p/${encodeURIComponent(slug)}/meu-agendamento#token=${encodeURIComponent(token)}`

function ir(p: Passo) {
  passo.value = p
  nextTick(() => titulo.value?.focus())
}

function focarCampo(id: string) {
  nextTick(() => document.getElementById(id)?.focus())
}

async function carregarHorarios() {
  if (carregando.value || !servicoId.value || !data.value) return
  carregando.value = true
  erroGeral.value = ''
  try {
    horarios.value = await api.horarios(servicoId.value, data.value)
    ir('horario')
  }
  catch (e) {
    erroGeral.value = mensagemErro(e as ApiError)
  }
  finally {
    carregando.value = false
  }
}

function escolherSugestao(iso: string) {
  data.value = iso.slice(0, 10)
  inicio.value = iso
  sugestoes.value = []
  erroGeral.value = ''
  ir('revisao')
}

function irParaRevisao() {
  erros.value = {}
  erroGeral.value = ''
  ir('revisao')
}

async function enviar() {
  if (enviando.value || !servicoId.value) return
  enviando.value = true
  erroGeral.value = ''
  erros.value = {}
  try {
    const resposta = await api.agendar({
      servico: servicoId.value,
      inicio: inicio.value,
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      observacao: form.observacao.trim() || undefined,
      consentimento: form.consentimento,
      website: form.website,
    })
    locais.adicionar(resposta.agendamento.token)
    // Token só vem agora: vai no fragmento (#), fora de logs/referrer, e a página de detalhes o guarda em memória.
    await navigateTo(
      `/p/${encodeURIComponent(slug)}/meu-agendamento#token=${encodeURIComponent(resposta.agendamento.token)}&novo=1`,
      { replace: true, external: true },
    )
  }
  catch (e) {
    await tratarErro(e as ApiError)
  }
  finally {
    enviando.value = false
  }
}

async function tratarErro(e: ApiError) {
  if (e.code === 'conflito_horario' || e.code === 'horario_indisponivel') {
    sugestoes.value = Array.isArray(e.extra.sugestoes) ? (e.extra.sugestoes as string[]) : []
    inicio.value = ''
    erroGeral.value = e.code === 'conflito_horario'
      ? 'Este horário acabou de ser ocupado. Escolha outro.'
      : 'Este horário não está mais disponível. Escolha outro.'
    try {
      if (servicoId.value && data.value) horarios.value = await api.horarios(servicoId.value, data.value)
    }
    catch { /* mantém a lista anterior */ }
    ir('horario')
    return
  }
  if (e.status === 400 && e.fields) {
    erros.value = e.fields
    if (e.fields.servico) {
      erroGeral.value = e.fields.servico.join(' ')
      ir('servico')
    }
    else if (e.fields.inicio) {
      erroGeral.value = e.fields.inicio.join(' ')
      ir('horario')
    }
    else {
      erroGeral.value = e.fields.non_field_errors?.join(' ') ?? e.fields.website?.join(' ') ?? ''
      ir('dados')
      const primeiro = ['nome', 'telefone', 'observacao', 'consentimento'].find(c => e.fields?.[c])
      if (primeiro) focarCampo(`campo-${primeiro}`)
    }
    return
  }
  erroGeral.value = mensagemErro(e)
}

const ROTULOS_PASSOS: { passo: Passo, rotulo: string }[] = [
  { passo: 'servico', rotulo: 'Serviço' },
  { passo: 'data', rotulo: 'Data' },
  { passo: 'horario', rotulo: 'Horário' },
  { passo: 'dados', rotulo: 'Dados' },
  { passo: 'revisao', rotulo: 'Revisão' },
]
const indicePasso = computed(() => ROTULOS_PASSOS.findIndex(p => p.passo === passo.value))

// Barra de ação fixa: resumo do que já foi escolhido, voltar e ação primária de cada passo.
const dataCurta = computed(() => {
  if (!data.value) return ''
  const t = formatarDataCurta(data.value).replace(/ \d{4}$/, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
})
const resumo = computed(() => {
  const s = servico.value
  if (!s) return ''
  const partes = [s.nome, formatarDuracao(s.duracao_min), formatarPreco(s.preco)]
  if (passo.value !== 'servico' && dataCurta.value) partes.push(dataCurta.value)
  if (inicio.value && passo.value !== 'servico' && passo.value !== 'data') partes.push(formatarIso(inicio.value).hora)
  return partes.join(' · ')
})
const barra = computed<{ rotulo: string, voltar: Passo | '', bloqueado: boolean, ajuda: string }>(() => {
  switch (passo.value) {
    case 'servico':
      return { rotulo: 'Continuar', voltar: '', bloqueado: !servicoId.value, ajuda: 'Escolha um serviço para continuar' }
    case 'data':
      return { rotulo: 'Ver horários', voltar: 'servico', bloqueado: carregando.value || !data.value, ajuda: data.value ? '' : 'Escolha uma data para continuar' }
    case 'horario':
      return {
        rotulo: 'Continuar', voltar: 'data', bloqueado: !inicio.value,
        ajuda: horarios.value?.horarios.length ? 'Escolha um horário para continuar' : 'Escolha outra data para ver horários',
      }
    case 'dados':
      return { rotulo: 'Revisar', voltar: 'horario', bloqueado: false, ajuda: '' }
    default:
      return { rotulo: enviando.value ? 'Enviando…' : 'Confirmar agendamento', voltar: 'dados', bloqueado: enviando.value, ajuda: '' }
  }
})

function descreve(campo: string) {
  return erros.value[campo] ? `erro-${campo}` : undefined
}
</script>

<template>
  <ContaNaoEncontrada v-if="carga?.erro?.status === 404" />
  <main v-else-if="carga?.erro" class="pagina-publica">
    <h1>Agendamento</h1>
    <div v-if="status === 'pending'" role="status" class="esqueletos">
      <p class="somente-leitor">Carregando…</p>
      <div v-for="n in 3" :key="n" class="esqueleto esqueleto-srv" aria-hidden="true" />
    </div>
    <div v-else class="estado-erro">
      <AvisoErro :mensagem="mensagemErro(carga.erro)" />
      <p><button type="button" class="btn-secundario" @click="refresh()">Tentar de novo</button></p>
    </div>
  </main>
  <main v-else class="pagina-publica" :class="{ 'com-barra': servicos.length }">
    <header class="pub-cab">
      <span class="pub-avatar" aria-hidden="true">{{ iniciaisDe(profissional) }}</span>
      <div class="pub-id">
        <h1>{{ profissional }}</h1>
        <p>Agendamento online</p>
      </div>
      <a :href="`/p/${encodeURIComponent(slug)}/meu-agendamento`" class="pub-meu">Meu agendamento</a>
    </header>

    <section v-for="m in meus" :key="m.token" class="cartao meu-aviso" aria-label="Seu agendamento">
      <UiIcon nome="calendario-check" />
      <p>
        Você tem um agendamento:
        <strong>{{ formatarDataExtenso(m.ag.inicio.slice(0, 10)) }} às {{ formatarIso(m.ag.inicio).hora }}</strong>
      </p>
      <a :href="linkMeu(m.token)" class="btn btn-secundario">Ver detalhes</a>
    </section>

    <UiEmpty
      v-if="!servicos.length" icone="servicos" titulo="Nenhum serviço disponível agora"
      texto="Fale com a profissional para saber os horários."
    >
      <a v-if="whatsappPublico" :href="whatsappPublico" class="btn btn-secundario" target="_blank" rel="noopener noreferrer">
        <UiIcon nome="whatsapp" :tamanho="20" />Falar no WhatsApp
      </a>
    </UiEmpty>

    <section v-else>
      <ol class="progresso" aria-label="Progresso do agendamento">
        <li
          v-for="(p, i) in ROTULOS_PASSOS" :key="p.passo"
          :class="{ feito: i < indicePasso }" :aria-current="i === indicePasso ? 'step' : undefined"
        >
          <span class="rotulo">{{ p.rotulo }}</span><span v-if="i < indicePasso" class="somente-leitor"> (concluído)</span>
        </li>
      </ol>
      <h2 ref="titulo" tabindex="-1" class="passo-titulo">{{ titulos[passo] }}</h2>
      <p v-if="passo === 'servico'" class="passo-apoio">Toque no serviço que você quer agendar.</p>
      <AvisoErro v-if="erroGeral" :mensagem="erroGeral" />

      <!-- 1. Serviço -->
      <form v-if="passo === 'servico'" id="passo-servico" class="passo" @submit.prevent="ir('data')">
        <fieldset role="radiogroup">
          <legend class="somente-leitor">Serviço</legend>
          <div class="srv-lista">
            <ServicoOpcao v-for="(s, i) in servicos" :key="s.id" v-model="servicoId" :servico="s" :indice="i" />
          </div>
          <p class="somente-leitor" role="status" aria-live="polite">{{ servico ? `${servico.nome} selecionado` : '' }}</p>
        </fieldset>
      </form>

      <!-- 2. Data -->
      <form v-else-if="passo === 'data'" id="passo-data" class="passo" @submit.prevent="carregarHorarios">
        <p class="campo">
          <label for="campo-data">Data</label>
          <UiDatePicker id="campo-data" v-model="data" :min="hoje || undefined" label="Escolher data" />
        </p>
      </form>

      <!-- 3. Horário -->
      <div v-else-if="passo === 'horario'" class="passo">
        <p>{{ servico?.nome }} em {{ formatarIso(`${data}T00:00`).data }}</p>
        <div v-if="sugestoes.length" class="aviso">
          <p>Horários próximos sugeridos:</p>
          <ul>
            <li v-for="s in sugestoes" :key="s">
              <button type="button" @click="escolherSugestao(s)">
                {{ formatarIso(s).data }} às {{ formatarIso(s).hora }}
              </button>
            </li>
          </ul>
        </div>
        <form v-if="horarios?.horarios.length" id="passo-horario" @submit.prevent="ir('dados')">
          <fieldset>
            <legend>Horários disponíveis</legend>
            <div class="chips">
              <span v-for="h in horarios.horarios" :key="h" class="chip-opcao">
                <input :id="`h-${h}`" v-model="inicio" type="radio" name="horario" :value="h" required>
                <label :for="`h-${h}`" class="chip">{{ formatarIso(h).hora }}</label>
              </span>
            </div>
          </fieldset>
        </form>
        <p v-else class="vazio">Não há horários disponíveis nesta data.</p>
      </div>

      <!-- 4. Dados -->
      <form v-else-if="passo === 'dados'" id="passo-dados" class="passo" @submit.prevent="irParaRevisao">
        <p class="campo">
          <label for="campo-nome">Nome</label>
          <input
            id="campo-nome" v-model="form.nome" type="text" name="nome" autocomplete="name"
            required minlength="2" maxlength="100" :aria-describedby="descreve('nome')" :aria-invalid="!!erros.nome"
          >
          <span v-if="erros.nome" id="erro-nome" role="alert">{{ erros.nome.join(' ') }}</span>
        </p>
        <p class="campo">
          <label for="campo-telefone">WhatsApp (com DDD)</label>
          <input
            id="campo-telefone" v-model="form.telefone" type="tel" inputmode="tel" name="telefone" autocomplete="tel"
            required maxlength="30" :aria-describedby="descreve('telefone')" :aria-invalid="!!erros.telefone"
          >
          <span v-if="erros.telefone" id="erro-telefone" role="alert">{{ erros.telefone.join(' ') }}</span>
        </p>
        <p class="campo">
          <label for="campo-observacao">Observação (opcional)</label>
          <textarea
            id="campo-observacao" v-model="form.observacao" name="observacao" maxlength="500"
            :aria-describedby="descreve('observacao')" :aria-invalid="!!erros.observacao"
          />
          <span v-if="erros.observacao" id="erro-observacao" role="alert">{{ erros.observacao.join(' ') }}</span>
        </p>
        <!-- Campo-isca: deve ir vazio. Oculto por `hidden`, fora da ordem de tabulação. -->
        <div hidden aria-hidden="true">
          <label for="campo-website">Website</label>
          <input id="campo-website" v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off">
        </div>
        <p class="campo campo-check">
          <!-- TODO texto final jurídico (BLQ-7): texto provisório. -->
          <input
            id="campo-consentimento" v-model="form.consentimento" type="checkbox" name="consentimento"
            required :aria-describedby="descreve('consentimento')" :aria-invalid="!!erros.consentimento"
          >
          <label for="campo-consentimento">
            Autorizo o uso do meu nome e telefone para este agendamento (texto provisório).
          </label>
          <span v-if="erros.consentimento" id="erro-consentimento" role="alert">{{ erros.consentimento.join(' ') }}</span>
        </p>
      </form>

      <!-- 5. Revisão -->
      <form v-else-if="passo === 'revisao'" id="passo-revisao" class="passo cartao" @submit.prevent="enviar">
        <AgendamentoDetalhes
          :servico="servico?.nome ?? ''"
          :profissional="profissional"
          :inicio="inicio"
          :preco="servico?.preco"
        />
        <dl>
          <dt>Nome</dt>
          <dd>{{ form.nome }}</dd>
          <dt>WhatsApp</dt>
          <dd>{{ form.telefone }}</dd>
          <template v-if="form.observacao">
            <dt>Observação</dt>
            <dd>{{ form.observacao }}</dd>
          </template>
        </dl>
        <p>Após confirmar, você receberá um link para consultar e cancelar o agendamento. O prazo de cancelamento aparece na consulta do agendamento.</p>
      </form>
    </section>

    <!-- Barra de ação fixa (todos os passos): resumo, voltar e ação primária -->
    <div v-if="servicos.length" class="barra-acao">
      <div class="barra-conteudo">
        <p v-if="resumo" class="barra-resumo">{{ resumo }}</p>
        <p v-if="barra.bloqueado && barra.ajuda" id="barra-ajuda" class="barra-ajuda">{{ barra.ajuda }}</p>
        <div class="barra-botoes">
          <button v-if="barra.voltar" type="button" class="barra-voltar" :disabled="enviando" @click="ir(barra.voltar)">Voltar</button>
          <button
            type="submit" class="barra-primario" :form="`passo-${passo}`" :disabled="barra.bloqueado"
            :aria-busy="enviando || carregando || undefined" :aria-describedby="barra.bloqueado && barra.ajuda ? 'barra-ajuda' : undefined"
          >
            {{ barra.rotulo }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
