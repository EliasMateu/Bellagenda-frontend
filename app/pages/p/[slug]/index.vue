<script setup lang="ts">
import type { AgendamentoCriado, HorariosResposta, Servico, ServicosResposta } from '~/composables/usePublico'
import type { ApiError } from '~/composables/useApi'

type Passo = 'servico' | 'data' | 'horario' | 'dados' | 'revisao' | 'confirmado'

const slug = String(useRoute().params.slug)
const api = usePublico(slug)

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
const criado = ref<AgendamentoCriado['agendamento'] | null>(null)

const servicos = computed<Servico[]>(() => carga.value?.dados?.servicos ?? [])
const profissional = computed(() => carga.value?.dados?.nome_exibicao ?? '')
const servico = computed(() => servicos.value.find(s => s.id === servicoId.value))
const titulos: Record<Passo, string> = {
  servico: '1. Escolha o serviço',
  data: '2. Escolha a data',
  horario: '3. Escolha o horário',
  dados: '4. Seus dados',
  revisao: '5. Revise e confirme',
  confirmado: 'Agendamento recebido',
}

onMounted(() => {
  const d = new Date()
  hoje.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

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
    criado.value = resposta.agendamento
    ir('confirmado')
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

function descreve(campo: string) {
  return erros.value[campo] ? `erro-${campo}` : undefined
}
</script>

<template>
  <ContaNaoEncontrada v-if="carga?.erro?.status === 404" />
  <main v-else-if="carga?.erro">
    <h1>Agendamento</h1>
    <AvisoErro :mensagem="mensagemErro(carga.erro)" />
  </main>
  <main v-else>
    <h1>Agendar com {{ profissional }}</h1>

    <p v-if="!servicos.length">Nenhum serviço disponível no momento.</p>

    <section v-else>
      <h2 v-if="passo !== 'confirmado'" ref="titulo" tabindex="-1">{{ titulos[passo] }}</h2>
      <AvisoErro v-if="erroGeral" :mensagem="erroGeral" />

      <!-- 1. Serviço -->
      <form v-if="passo === 'servico'" @submit.prevent="ir('data')">
        <fieldset>
          <legend>Serviço</legend>
          <p v-for="s in servicos" :key="s.id">
            <input :id="`servico-${s.id}`" v-model="servicoId" type="radio" name="servico" :value="s.id" required>
            <label :for="`servico-${s.id}`">{{ s.nome }} — {{ s.duracao_min }} min — {{ formatarPreco(s.preco) }}</label>
          </p>
        </fieldset>
        <button type="submit" :disabled="!servicoId">Continuar</button>
      </form>

      <!-- 2. Data -->
      <form v-else-if="passo === 'data'" @submit.prevent="carregarHorarios">
        <p>Serviço: {{ servico?.nome }}</p>
        <p>
          <label for="campo-data">Data</label>
          <input id="campo-data" v-model="data" type="date" :min="hoje || undefined" required>
        </p>
        <button type="button" @click="ir('servico')">Voltar</button>
        <button type="submit" :disabled="carregando || !data">Ver horários</button>
      </form>

      <!-- 3. Horário -->
      <div v-else-if="passo === 'horario'">
        <p>{{ servico?.nome }} em {{ formatarIso(`${data}T00:00`).data }}</p>
        <div v-if="sugestoes.length">
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
            <span v-for="h in horarios.horarios" :key="h">
              <input :id="`h-${h}`" v-model="inicio" type="radio" name="horario" :value="h" required>
              <label :for="`h-${h}`">{{ formatarIso(h).hora }}</label>
            </span>
          </fieldset>
          <button type="button" @click="ir('data')">Escolher outra data</button>
          <button type="submit" :disabled="!inicio">Continuar</button>
        </form>
        <div v-else>
          <p>Não há horários disponíveis nesta data.</p>
          <button type="button" @click="ir('data')">Escolher outra data</button>
        </div>
      </div>

      <!-- 4. Dados -->
      <form v-else-if="passo === 'dados'" @submit.prevent="irParaRevisao">
        <p>
          <label for="campo-nome">Nome</label>
          <input
            id="campo-nome" v-model="form.nome" type="text" name="nome" autocomplete="name"
            required minlength="2" maxlength="100" :aria-describedby="descreve('nome')" :aria-invalid="!!erros.nome"
          >
          <span v-if="erros.nome" id="erro-nome" role="alert">{{ erros.nome.join(' ') }}</span>
        </p>
        <p>
          <label for="campo-telefone">WhatsApp (com DDD)</label>
          <input
            id="campo-telefone" v-model="form.telefone" type="tel" inputmode="tel" name="telefone" autocomplete="tel"
            required maxlength="30" :aria-describedby="descreve('telefone')" :aria-invalid="!!erros.telefone"
          >
          <span v-if="erros.telefone" id="erro-telefone" role="alert">{{ erros.telefone.join(' ') }}</span>
        </p>
        <p>
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
        <p>
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
      <form v-else-if="passo === 'revisao'" @submit.prevent="enviar">
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

      <!-- 6. Confirmação -->
      <AgendamentoConfirmado v-else-if="passo === 'confirmado' && criado" :slug="slug" :criado="criado" />
    </section>
  </main>
</template>
