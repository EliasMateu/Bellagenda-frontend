<script setup lang="ts">
import type { AgendamentoConsultado, HorariosResposta, Servico, ServicosResposta } from '~/composables/usePublico'
import type { ApiError } from '~/composables/useApi'

type Passo = 'servico' | 'data' | 'horario' | 'dados' | 'revisao'

const slug = String(useRoute().params.slug)
const api = usePublico(slug)
const locais = useAgendamentosLocais(slug)

const { data: carga } = await useAsyncData(`servicos-${slug}`, async () => {
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
const servico = computed(() => servicos.value.find(s => s.id === servicoId.value))
const titulos: Record<Passo, string> = {
  servico: '1. Escolha o serviço',
  data: '2. Escolha a data',
  horario: '3. Escolha o horário',
  dados: '4. Seus dados',
  revisao: '5. Revise e confirme',
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

function descreve(campo: string) {
  return erros.value[campo] ? `erro-${campo}` : undefined
}
</script>

<template>
  <ContaNaoEncontrada v-if="carga?.erro?.status === 404" />
  <main v-else-if="carga?.erro" class="pagina-publica">
    <h1>Agendamento</h1>
    <AvisoErro :mensagem="mensagemErro(carga.erro)" />
  </main>
  <main v-else class="pagina-publica">
    <div class="pub-cab">
      <h1>Agendar com {{ profissional }}</h1>
      <a :href="`/p/${encodeURIComponent(slug)}/meu-agendamento`" class="pub-meu">Meu agendamento</a>
    </div>

    <section v-for="m in meus" :key="m.token" class="cartao meu-aviso" aria-label="Seu agendamento">
      <UiIcon nome="calendario-check" />
      <p>
        Você tem um agendamento:
        <strong>{{ formatarDataExtenso(m.ag.inicio.slice(0, 10)) }} às {{ formatarIso(m.ag.inicio).hora }}</strong>
      </p>
      <a :href="linkMeu(m.token)" class="btn btn-secundario">Ver detalhes</a>
    </section>

    <p v-if="!servicos.length" class="vazio">Nenhum serviço disponível no momento.</p>

    <section v-else>
      <ol class="progresso" aria-label="Progresso do agendamento">
        <li
          v-for="(p, i) in ROTULOS_PASSOS" :key="p.passo"
          :class="{ feito: i < indicePasso }" :aria-current="i === indicePasso ? 'step' : undefined"
        >
          <span class="rotulo">{{ p.rotulo }}</span>
        </li>
      </ol>
      <h2 ref="titulo" tabindex="-1">{{ titulos[passo] }}</h2>
      <AvisoErro v-if="erroGeral" :mensagem="erroGeral" />

      <!-- 1. Serviço -->
      <form v-if="passo === 'servico'" class="passo" @submit.prevent="ir('data')">
        <fieldset>
          <legend>Serviço</legend>
          <div class="opcoes">
            <div v-for="s in servicos" :key="s.id" class="opcao">
              <input :id="`servico-${s.id}`" v-model="servicoId" type="radio" name="servico" :value="s.id" required>
              <label :for="`servico-${s.id}`">{{ s.nome }} — {{ s.duracao_min }} min — {{ formatarPreco(s.preco) }}</label>
            </div>
          </div>
        </fieldset>
        <button type="submit" :disabled="!servicoId">Continuar</button>
      </form>

      <!-- 2. Data -->
      <form v-else-if="passo === 'data'" class="passo" @submit.prevent="carregarHorarios">
        <p>Serviço: {{ servico?.nome }}</p>
        <p class="campo">
          <label for="campo-data">Data</label>
          <UiDatePicker id="campo-data" v-model="data" :min="hoje || undefined" label="Escolher data" />
        </p>
        <button type="button" @click="ir('servico')">Voltar</button>
        <button type="submit" :disabled="carregando || !data">Ver horários</button>
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
        <form v-if="horarios?.horarios.length" @submit.prevent="ir('dados')">
          <fieldset>
            <legend>Horários disponíveis</legend>
            <div class="chips">
              <span v-for="h in horarios.horarios" :key="h" class="chip-opcao">
                <input :id="`h-${h}`" v-model="inicio" type="radio" name="horario" :value="h" required>
                <label :for="`h-${h}`" class="chip">{{ formatarIso(h).hora }}</label>
              </span>
            </div>
          </fieldset>
          <button type="button" @click="ir('data')">Escolher outra data</button>
          <button type="submit" :disabled="!inicio">Continuar</button>
        </form>
        <div v-else>
          <p class="vazio">Não há horários disponíveis nesta data.</p>
          <button type="button" @click="ir('data')">Escolher outra data</button>
        </div>
      </div>

      <!-- 4. Dados -->
      <form v-else-if="passo === 'dados'" class="passo" @submit.prevent="irParaRevisao">
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
        <button type="button" @click="ir('horario')">Voltar</button>
        <button type="submit">Revisar</button>
      </form>

      <!-- 5. Revisão -->
      <form v-else-if="passo === 'revisao'" class="passo cartao" @submit.prevent="enviar">
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
        <button type="button" :disabled="enviando" @click="ir('dados')">Voltar</button>
        <button type="submit" :disabled="enviando">{{ enviando ? 'Enviando…' : 'Confirmar agendamento' }}</button>
      </form>

    </section>
  </main>
</template>
