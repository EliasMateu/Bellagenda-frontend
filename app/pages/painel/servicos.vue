<script setup lang="ts">
import type { ServicoPainel } from '~/composables/usePainel'

const api = usePainelApi()
const carga = useEnvio()
const lista = useEnvio()
const envio = useEnvio()

const servicos = ref<ServicoPainel[]>([])
const carregou = ref(false)
const editando = ref<number | 'novo' | null>(null)
const apagando = ref<number | null>(null)
const form = reactive({ nome: '', duracao_min: '' as string | number, preco: '', ativo: true })

type Situacao = 'todos' | 'ativos' | 'inativos'
const SITUACOES: { valor: Situacao, rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' },
]
const situacao = ref<Situacao>('todos')
const visiveis = computed(() =>
  servicos.value.filter(s => situacao.value === 'todos' || (situacao.value === 'ativos' ? s.ativo : !s.ativo)),
)

const folha = computed({
  get: () => editando.value !== null,
  set: (v: boolean) => {
    if (!v) editando.value = null
  },
})

async function carregar() {
  const r = await carga.executar(() => api.servicos.listar())
  if (r) servicos.value = r
  carregou.value = true
}

function abrir(s?: ServicoPainel) {
  envio.limpar()
  editando.value = s ? s.id : 'novo'
  form.nome = s?.nome ?? ''
  form.duracao_min = s?.duracao_min ?? ''
  form.preco = s?.preco ?? ''
  form.ativo = s?.ativo ?? true
}

async function salvar() {
  const corpo = {
    nome: form.nome.trim(),
    duracao_min: Number(form.duracao_min),
    preco: String(form.preco).replace(',', '.'),
    ativo: form.ativo,
  }
  const id = editando.value
  const r = await envio.executar(() => (typeof id === 'number' ? api.servicos.editar(id, corpo) : api.servicos.criar(corpo)))
  if (r) {
    editando.value = null
    await carregar()
  }
  else {
    await envio.focarPrimeiroErro(['nome', 'duracao_min', 'preco'])
  }
}

async function alternar(s: ServicoPainel) {
  const r = await lista.executar(() => api.servicos.editar(s.id, { ativo: !s.ativo }))
  if (r) servicos.value = servicos.value.map(x => (x.id === s.id ? r : x))
}

async function apagar(id: number) {
  const r = await lista.executar(async () => {
    await api.servicos.apagar(id)
    return true
  })
  if (r) {
    apagando.value = null
    servicos.value = servicos.value.filter(s => s.id !== id)
  }
  else {
    apagando.value = null
  }
}

const menuDe = (s: ServicoPainel) => [
  { id: 'alternar', label: s.ativo ? 'Inativar' : 'Ativar' },
  { id: 'apagar', label: 'Apagar', danger: true },
]
function aoMenu(s: ServicoPainel, id: string) {
  if (id === 'alternar') void alternar(s)
  else apagando.value = s.id
}

onMounted(carregar)
</script>

<template>
  <section class="gestao">
    <GestaoCabecalho titulo="Serviços" acao="Adicionar serviço" @acao="abrir()" />

    <div v-if="servicos.length" class="segmentado" role="group" aria-label="Situação do serviço">
      <button
        v-for="f in SITUACOES" :key="f.valor" type="button" :aria-pressed="situacao === f.valor"
        @click="situacao = f.valor"
      >
        {{ f.rotulo }}
      </button>
    </div>

    <AvisoErro v-if="lista.erro.value" :mensagem="lista.erro.value" />
    <p v-if="lista.erro.value.includes('uso')" class="ajuda">Dica: inative o serviço em vez de apagar.</p>

    <div v-if="!carregou && !carga.erro.value" role="status" class="esqueletos">
      <p class="somente-leitor">Carregando…</p>
      <div v-for="n in 3" :key="n" class="esqueleto esqueleto-cartao" aria-hidden="true" />
    </div>

    <div v-else-if="carga.erro.value && !servicos.length" class="estado-erro">
      <AvisoErro :mensagem="carga.erro.value" />
      <p><button type="button" class="btn-secundario" @click="carregar">Tentar de novo</button></p>
    </div>

    <UiEmpty
      v-else-if="!servicos.length" icone="servicos" titulo="Nenhum serviço ainda"
      texto="Cadastre os serviços que você oferece para liberar o agendamento." acao="Adicionar serviço" @acao="abrir()"
    />

    <p v-else-if="!visiveis.length" class="vazio">Nenhum serviço nesta situação.</p>

    <ul v-else class="grade-gestao">
      <CartaoItem
        v-for="s in visiveis" :key="s.id" acao-rotulo="Editar" :menu="menuDe(s)"
        @acao="abrir(s)" @menu="id => aoMenu(s, id)"
      >
        <h3 class="cg-nome">{{ s.nome }}</h3>
        <p class="cg-sec">{{ formatarDuracao(s.duracao_min) }} · {{ formatarPreco(s.preco) }}</p>
        <template #selo>
          <span class="distintivo-status" :data-status="s.ativo ? 'ativo' : 'inativo'">{{ s.ativo ? 'Ativo' : 'Inativo' }}</span>
        </template>
        <template #extra>
          <ConfirmarAcao
            v-if="apagando === s.id" pergunta="Apagar este serviço? Isto não pode ser desfeito." rotulo="Sim, apagar"
            :enviando="lista.enviando.value" @voltar="apagando = null" @confirmar="apagar(s.id)"
          />
        </template>
      </CartaoItem>
    </ul>

    <UiSheet v-model="folha" :titulo="editando === 'novo' ? 'Novo serviço' : 'Editar serviço'">
      <form @submit.prevent="salvar">
        <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
        <CampoForm id="nome" v-model="form.nome" label="Nome" required maxlength="100" data-autofocus :erros="envio.erros.value.nome" />
        <CampoForm
          id="duracao_min" v-model="form.duracao_min" tipo="number" label="Duração" sufixo="min" required min="1"
          inputmode="numeric" :erros="envio.erros.value.duracao_min"
        />
        <CampoForm id="preco" v-model="form.preco" label="Preço" prefixo="R$" inputmode="decimal" required :erros="envio.erros.value.preco" />
        <UiSwitch v-model="form.ativo" label="Ativo" ajuda="Serviços ativos aparecem para as clientes agendarem." />
        <p class="acoes acoes-folha">
          <button type="button" class="btn-secundario" :disabled="envio.enviando.value" @click="editando = null">Cancelar</button>
          <button type="submit" :disabled="envio.enviando.value" :aria-busy="envio.enviando.value || undefined">
            {{ envio.enviando.value ? 'Salvando…' : 'Salvar' }}
          </button>
        </p>
      </form>
    </UiSheet>
  </section>
</template>
