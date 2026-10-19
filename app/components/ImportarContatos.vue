<script setup lang="ts">
/**
 * Importar contatos (D-36): escolha -> prévia -> importação -> resultado, numa folha.
 * Nada é enviado ao servidor antes de a pessoa tocar para ver a prévia; contatos não vão para console,
 * localStorage nem log. A prévia (simular=true) nunca grava; a confirmação envia só os marcados.
 */
import type { ApiError } from '~/composables/useApi'
import type { ContatoImportar, ItemImportacao } from '~/composables/usePainel'

type Passo = 'escolha' | 'verificando' | 'previa' | 'importando' | 'resultado'
type Filtro = 'novo' | 'duplicado' | 'invalido' | 'todos'
interface Linha { indice: number, item: ItemImportacao, marcado: boolean }
interface SeletorContatos {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<Array<{ name?: string[], tel?: string[] }>>
}

const TAMANHO_BLOCO = 300

const aberto = defineModel<boolean>({ default: false })
const emit = defineEmits<{ concluido: [] }>()

const api = usePainelApi()
const { expirou } = useSessao()

const raiz = ref<HTMLElement | null>(null)
const passo = ref<Passo>('escolha')
const temSeletor = ref(false)
const erro = ref('')
const aviso = ref('')
const lidos = ref<ContatoImportar[]>([])
const linhas = ref<Linha[]>([])
const filtro = ref<Filtro>('novo')
const busca = ref('')
const progresso = reactive({ feitos: 0, total: 0 })
const falhaImportacao = ref('')
const criados = ref(0)
const duplicadosNaConfirmacao = ref(0)
const invalidosNaConfirmacao = ref(0)
const enviados = ref(0)

let alvo: ContatoImportar[] = []
let proximoBloco = 0
let cancelado = false
let jaAvisouConcluido = false

onMounted(() => {
  temSeletor.value = 'contacts' in navigator && 'ContactsManager' in window
})

const blocos = <T,>(lista: T[]) => {
  const saida: T[][] = []
  for (let i = 0; i < lista.length; i += TAMANHO_BLOCO) saida.push(lista.slice(i, i + TAMANHO_BLOCO))
  return saida
}

function reiniciar() {
  passo.value = 'escolha'
  erro.value = ''
  aviso.value = ''
  lidos.value = []
  linhas.value = []
  filtro.value = 'novo'
  busca.value = ''
  progresso.feitos = 0
  progresso.total = 0
  falhaImportacao.value = ''
  criados.value = 0
  duplicadosNaConfirmacao.value = 0
  invalidosNaConfirmacao.value = 0
  enviados.value = 0
  alvo = []
  proximoBloco = 0
  cancelado = false
  jaAvisouConcluido = false
}

watch(aberto, (v) => {
  if (v) {
    reiniciar()
    return
  }
  cancelado = true
  if (criados.value > 0 && !jaAvisouConcluido) {
    jaAvisouConcluido = true
    emit('concluido')
  }
})

watch(passo, async () => {
  await nextTick()
  raiz.value?.querySelector<HTMLElement>('[data-foco-passo]')?.focus()
})

const tituloFolha = computed(() => ({
  escolha: 'Importar contatos',
  verificando: 'Importar contatos',
  previa: 'Revisar contatos',
  importando: 'Importando contatos',
  resultado: 'Importação concluída',
}[passo.value]))

// ---------------------------------------------------------------- mensagens

function minutos(segundos?: number) {
  if (!segundos) return 'daqui a pouco'
  if (segundos < 90) return `em ${segundos} segundo(s)`
  return `em ${Math.ceil(segundos / 60)} minuto(s)`
}

function mensagemFalha(e: ApiError, acao: 'verificar' | 'importar'): string {
  if (e.code === 'erro_rede') return 'Falha de conexão. Seus contatos foram mantidos; tente de novo.'
  if (e.code === 'limite_requisicoes') {
    return `Muitas ${acao === 'verificar' ? 'verificações' : 'importações'} seguidas. Tente de novo ${minutos(e.retryAfter)}.`
  }
  if (e.status === 403) return 'Sua conta não pode importar contatos agora. Fale com o suporte se isso continuar.'
  return e.message || 'Não foi possível concluir. Tente novamente.'
}

const ehSessaoExpirada = (e: ApiError) => (e.status === 401 && e.code !== 'credenciais_invalidas') || e.code === 'nao_autenticado'

// ---------------------------------------------------------------- escolha

function textoErroLeitura(e: unknown): string {
  return e instanceof ErroLeitura ? MENSAGEM_ERRO_LEITURA[e.codigo] : 'Não foi possível ler o arquivo. Tente outro arquivo.'
}

// Chamado direto no clique (gesto do usuário), sem await antes de navigator.contacts.select.
async function escolherDoCelular() {
  erro.value = ''
  const seletor = (navigator as Navigator & { contacts?: SeletorContatos }).contacts
  if (!seletor) {
    erro.value = 'Este aparelho não permite escolher contatos aqui. Use a opção de enviar um arquivo.'
    return
  }
  let escolhidos: Awaited<ReturnType<SeletorContatos['select']>>
  try {
    escolhidos = await seletor.select(['name', 'tel'], { multiple: true })
  }
  catch (e) {
    const nome = (e as { name?: string }).name
    if (nome === 'AbortError') return
    erro.value = nome === 'SecurityError' || nome === 'NotSupportedError'
      ? 'Não foi possível abrir seus contatos neste aparelho. Use a opção de enviar um arquivo (.vcf ou .csv).'
      : 'Não foi possível abrir seus contatos agora. Tente de novo ou envie um arquivo.'
    return
  }
  if (!escolhidos.length) return // cancelou: volta sem erro
  const r = contatosDoSeletor(escolhidos)
  if (!r.contatos.length) {
    erro.value = 'Os contatos escolhidos não têm telefone.'
    return
  }
  await preparar(r.contatos)
}

async function aoEscolherArquivo(ev: Event) {
  const campo = ev.target as HTMLInputElement
  const arquivo = campo.files?.[0]
  campo.value = '' // permite escolher o mesmo arquivo de novo
  if (!arquivo) return
  erro.value = ''
  if (arquivo.size === 0) {
    erro.value = MENSAGEM_ERRO_LEITURA.vazio
    return
  }
  if (arquivo.size > LIMITE_BYTES) {
    erro.value = MENSAGEM_ERRO_LEITURA.grande_demais
    return
  }
  try {
    const texto = decodificarTexto(new Uint8Array(await arquivo.arrayBuffer()))
    await preparar(lerArquivoTexto(arquivo.name, texto).contatos)
  }
  catch (e) {
    erro.value = textoErroLeitura(e)
  }
}

async function preparar(contatos: ContatoImportar[]) {
  aviso.value = ''
  let lista = contatos
  if (lista.length > LIMITE_POR_IMPORTACAO) {
    aviso.value = `Selecione até ${LIMITE_POR_IMPORTACAO} contatos por vez. Usamos só os primeiros ${LIMITE_POR_IMPORTACAO}; importe o restante em outra rodada.`
    lista = lista.slice(0, LIMITE_POR_IMPORTACAO)
  }
  lidos.value = lista
  await verificar()
}

// ---------------------------------------------------------------- prévia

async function verificar() {
  passo.value = 'verificando'
  erro.value = ''
  progresso.feitos = 0
  progresso.total = lidos.value.length
  const novas: Linha[] = []
  try {
    const partes = blocos(lidos.value)
    for (const [b, bloco] of partes.entries()) {
      if (cancelado) return
      const r = await api.clientes.importar(bloco, true)
      for (const item of r.itens) {
        novas.push({ indice: b * TAMANHO_BLOCO + item.indice, item, marcado: item.status === 'novo' })
      }
      progresso.feitos += bloco.length
    }
  }
  catch (e) {
    const err = e as ApiError
    if (ehSessaoExpirada(err)) {
      await expirou()
      return
    }
    erro.value = mensagemFalha(err, 'verificar')
    return
  }
  linhas.value = novas
  filtro.value = novas.some(l => l.item.status === 'novo') ? 'novo' : 'todos'
  busca.value = ''
  passo.value = 'previa'
}

const contagem = computed(() => {
  const c = { novo: 0, duplicado: 0, invalido: 0, todos: linhas.value.length }
  for (const l of linhas.value) c[l.item.status]++
  return c
})

const visiveis = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  const digitos = termo.replace(/\D/g, '')
  return linhas.value.filter((l) => {
    if (filtro.value !== 'todos' && l.item.status !== filtro.value) return false
    if (!termo) return true
    return l.item.nome.toLowerCase().includes(termo)
      || (!!digitos && (l.item.telefone ?? lidos.value[l.indice]?.telefone ?? '').replace(/\D/g, '').includes(digitos))
  })
})

const marcadosN = computed(() => linhas.value.filter(l => l.marcado).length)

function marcarTodosNovos(valor: boolean) {
  for (const l of linhas.value) if (l.item.status === 'novo') l.marcado = valor
}

const FILTROS: Array<{ id: Filtro, rotulo: string }> = [
  { id: 'novo', rotulo: 'Novos' },
  { id: 'duplicado', rotulo: 'Já cadastrados' },
  { id: 'invalido', rotulo: 'Inválidos' },
  { id: 'todos', rotulo: 'Todos' },
]

function nomeDe(l: Linha) {
  return l.item.nome || lidos.value[l.indice]?.nome || 'Sem nome'
}
function telefoneDe(l: Linha) {
  const t = l.item.telefone ? formatarTelefoneBR(l.item.telefone) : (lidos.value[l.indice]?.telefone ?? '')
  return t === nomeDe(l) ? '' : t
}
function selo(l: Linha): { texto: string, tom: 'ok' | 'neutro' | 'erro', icone: 'check' | 'usuario' | 'copiar' | 'alerta' } {
  switch (l.item.motivo) {
    case 'ja_cadastrado': return { texto: 'Já cadastrado', tom: 'neutro', icone: 'usuario' }
    case 'repetido_na_lista': return { texto: 'Repetido na lista', tom: 'neutro', icone: 'copiar' }
    case 'telefone_invalido': return { texto: 'Número inválido', tom: 'erro', icone: 'alerta' }
    case 'nome_invalido': return { texto: 'Nome inválido', tom: 'erro', icone: 'alerta' }
    default: return { texto: 'Novo', tom: 'ok', icone: 'check' }
  }
}

// ---------------------------------------------------------------- importação

async function importar() {
  alvo = linhas.value.filter(l => l.marcado).map(l => lidos.value[l.indice]).filter((c): c is ContatoImportar => !!c)
  if (!alvo.length) return
  enviados.value = alvo.length
  proximoBloco = 0
  criados.value = 0
  duplicadosNaConfirmacao.value = 0
  invalidosNaConfirmacao.value = 0
  progresso.feitos = 0
  progresso.total = alvo.length
  passo.value = 'importando'
  await continuar()
}

// Reenviar é seguro: o backend ignora quem já existe. Continua do bloco que falhou.
async function continuar() {
  falhaImportacao.value = ''
  const partes = blocos(alvo)
  while (proximoBloco < partes.length) {
    if (cancelado) return
    const bloco = partes[proximoBloco] as ContatoImportar[]
    try {
      const r = await api.clientes.importar(bloco, false)
      criados.value += r.criados
      duplicadosNaConfirmacao.value += r.resumo.duplicados
      invalidosNaConfirmacao.value += r.resumo.invalidos
      progresso.feitos += bloco.length
      proximoBloco++
    }
    catch (e) {
      const err = e as ApiError
      if (ehSessaoExpirada(err)) {
        await expirou()
        return
      }
      const parcial = criados.value
        ? ` ${criados.value} ${criados.value === 1 ? 'contato já foi importado' : 'contatos já foram importados'}.`
        : ''
      falhaImportacao.value = `${mensagemFalha(err, 'importar')}${parcial}`
      return
    }
  }
  passo.value = 'resultado'
}

const jaExistiam = computed(() => contagem.value.duplicado + duplicadosNaConfirmacao.value)
const ignorados = computed(() => contagem.value.invalido + invalidosNaConfirmacao.value + Math.max(0, contagem.value.novo - enviados.value))

function voltarParaEscolha() {
  erro.value = ''
  lidos.value = []
  linhas.value = []
  passo.value = 'escolha'
}

function fechar() {
  aberto.value = false
}
</script>

<template>
  <UiSheet v-model="aberto" :titulo="tituloFolha">
    <div ref="raiz" class="imp">
      <!-- (a) escolha -->
      <template v-if="passo === 'escolha'">
        <h3 class="imp-passo" tabindex="-1" data-foco-passo>De onde vêm os contatos?</h3>
        <p class="imp-priv">
          <UiIcon nome="escudo-check" :tamanho="20" />
          <span>Importamos só nome e telefone dos contatos que você marcar. Nada é lido sem você escolher.</span>
        </p>
        <AvisoErro v-if="erro" :mensagem="erro" />

        <button v-if="temSeletor" type="button" class="imp-opcao" @click="escolherDoCelular">
          <span class="imp-opcao-icone" aria-hidden="true"><UiIcon nome="contatos" :tamanho="24" /></span>
          <span class="imp-opcao-texto">
            <span class="imp-opcao-titulo">Escolher do celular</span>
            <span class="imp-opcao-apoio">Abre a lista de contatos do aparelho para você marcar quem quer trazer.</span>
          </span>
        </button>

        <label class="imp-opcao imp-opcao-arquivo">
          <input
            type="file" accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv" class="imp-arquivo"
            aria-describedby="imp-arquivo-apoio" @change="aoEscolherArquivo"
          >
          <span class="imp-opcao-icone" aria-hidden="true"><UiIcon nome="importar" :tamanho="24" /></span>
          <span class="imp-opcao-texto">
            <span class="imp-opcao-titulo">Enviar arquivo (.vcf ou .csv)</span>
            <span id="imp-arquivo-apoio" class="imp-opcao-apoio">Arquivo exportado dos seus contatos. Até 5 MB.</span>
          </span>
        </label>

        <details class="imp-como">
          <summary>Como exportar do Android</summary>
          <ol>
            <li>Abra o app Contatos e toque no menu (três traços ou três pontos).</li>
            <li>Escolha Corrigir e gerenciar (ou Gerenciar contatos) e depois Exportar contatos.</li>
            <li>Salve como arquivo .vcf e volte aqui para enviá-lo.</li>
          </ol>
        </details>
        <details class="imp-como">
          <summary>Como exportar do iPhone</summary>
          <ol>
            <li>No computador, entre em icloud.com/contacts com o seu Apple ID.</li>
            <li>Selecione os contatos (Ctrl+A ou Cmd+A) e toque na engrenagem.</li>
            <li>Escolha Exportar vCard e envie o arquivo .vcf para este aparelho.</li>
          </ol>
        </details>
        <details class="imp-como">
          <summary>Como exportar do Google Contatos</summary>
          <ol>
            <li>Entre em contacts.google.com e marque os contatos desejados.</li>
            <li>Clique em Exportar e escolha Google CSV (ou vCard).</li>
            <li>Baixe o arquivo e envie-o aqui.</li>
          </ol>
        </details>
      </template>

      <!-- (b) verificando -->
      <template v-else-if="passo === 'verificando'">
        <h3 class="imp-passo" tabindex="-1" data-foco-passo>Verificando seus contatos</h3>
        <template v-if="!erro">
          <progress class="imp-barra" :max="progresso.total" :value="progresso.feitos" aria-label="Progresso da verificação" />
          <p role="status" aria-live="polite" class="imp-apoio">
            Verificando {{ progresso.feitos }} de {{ progresso.total }}…
          </p>
        </template>
        <template v-else>
          <AvisoErro :mensagem="erro" />
          <p class="acoes acoes-folha">
            <button type="button" class="btn-secundario" @click="voltarParaEscolha">Voltar</button>
            <button type="button" class="btn-primario" @click="verificar">Tentar de novo</button>
          </p>
        </template>
      </template>

      <!-- (b) prévia -->
      <template v-else-if="passo === 'previa'">
        <h3 class="imp-passo" tabindex="-1" data-foco-passo>
          {{ contagem.novo }} {{ contagem.novo === 1 ? 'contato novo' : 'contatos novos' }}
        </h3>
        <p class="imp-apoio">
          {{ contagem.todos }} {{ contagem.todos === 1 ? 'lido' : 'lidos' }}: {{ contagem.novo }} {{ contagem.novo === 1 ? 'novo' : 'novos' }},
          {{ contagem.duplicado }} já {{ contagem.duplicado === 1 ? 'cadastrado' : 'cadastrados' }} ou repetidos,
          {{ contagem.invalido }} {{ contagem.invalido === 1 ? 'inválido' : 'inválidos' }}.
        </p>
        <p v-if="aviso" class="imp-aviso-limite">{{ aviso }}</p>

        <UiSearchField v-model="busca" label="Buscar nos contatos lidos" placeholder="Buscar por nome ou telefone" />

        <div class="segmentado imp-filtros" role="group" aria-label="Filtrar contatos">
          <button
            v-for="f in FILTROS" :key="f.id" type="button" :aria-pressed="filtro === f.id" @click="filtro = f.id"
          >
            {{ f.rotulo }} ({{ contagem[f.id] }})
          </button>
        </div>

        <p v-if="contagem.novo" class="imp-massa">
          <button type="button" class="btn-secundario" @click="marcarTodosNovos(true)">Marcar todos os novos</button>
          <button type="button" class="btn-secundario" @click="marcarTodosNovos(false)">Desmarcar todos</button>
        </p>

        <p role="status" aria-live="polite" class="imp-contagem">
          Mostrando {{ visiveis.length }} de {{ contagem.todos }}. Marcados para importar: {{ marcadosN }}.
        </p>

        <ul v-if="visiveis.length" class="imp-lista">
          <li v-for="l in visiveis" :key="l.indice" class="imp-item">
            <component :is="l.item.status === 'novo' ? 'label' : 'div'" class="imp-linha">
              <input
                v-if="l.item.status === 'novo'" v-model="l.marcado" type="checkbox"
                :aria-label="`Importar ${nomeDe(l)}${telefoneDe(l) ? `, ${telefoneDe(l)}` : ''}`"
              >
              <span v-else class="imp-sem-caixa" aria-hidden="true" />
              <span class="imp-texto">
                <span class="imp-nome">{{ nomeDe(l) }}</span>
                <span v-if="telefoneDe(l)" class="imp-tel">{{ telefoneDe(l) }}</span>
                <span v-if="l.item.cliente_existente" class="imp-tel">Já está como {{ l.item.cliente_existente }}</span>
              </span>
              <span class="imp-selo" :data-tom="selo(l).tom">
                <UiIcon :nome="selo(l).icone" :tamanho="16" />{{ selo(l).texto }}
              </span>
            </component>
          </li>
        </ul>
        <p v-else class="imp-apoio imp-vazio">Nenhum contato neste filtro.</p>

        <div class="imp-rodape">
          <p class="imp-aviso">Você pode desmarcar quem não quer importar.</p>
          <p class="imp-acoes">
            <button type="button" class="btn-secundario" @click="fechar">Cancelar</button>
            <button type="button" class="btn-primario" :disabled="!marcadosN" @click="importar">
              Importar {{ marcadosN }} {{ marcadosN === 1 ? 'contato' : 'contatos' }}
            </button>
          </p>
        </div>
      </template>

      <!-- (c) importando -->
      <template v-else-if="passo === 'importando'">
        <h3 class="imp-passo" tabindex="-1" data-foco-passo>Importando contatos</h3>
        <progress class="imp-barra" :max="progresso.total" :value="progresso.feitos" aria-label="Progresso da importação" />
        <p role="status" aria-live="polite" class="imp-apoio">
          {{ falhaImportacao ? 'Importação interrompida' : 'Importando' }}: {{ progresso.feitos }} de {{ progresso.total }}
        </p>
        <template v-if="falhaImportacao">
          <AvisoErro :mensagem="falhaImportacao" />
          <p class="acoes acoes-folha">
            <button type="button" class="btn-secundario" @click="fechar">
              {{ criados ? 'Ver clientes' : 'Fechar' }}
            </button>
            <button type="button" class="btn-primario" @click="continuar">Tentar de novo</button>
          </p>
        </template>
      </template>

      <!-- (d) resultado -->
      <template v-else>
        <div class="imp-final">
          <span class="imp-final-icone" aria-hidden="true"><UiIcon nome="check" :tamanho="32" /></span>
          <h3 class="imp-passo" tabindex="-1" data-foco-passo role="status">
            {{ criados === 0 ? 'Nenhuma cliente importada' : `${criados} ${criados === 1 ? 'cliente importado' : 'clientes importados'}` }}
          </h3>
          <p class="imp-apoio">
            {{ jaExistiam }} já {{ jaExistiam === 1 ? 'existia' : 'existiam' }} e {{ ignorados }} {{ ignorados === 1 ? 'ignorado' : 'ignorados' }}.
          </p>
        </div>
        <p class="acoes acoes-folha">
          <button type="button" class="btn-primario" @click="fechar">Ver clientes</button>
        </p>
      </template>
    </div>
  </UiSheet>
</template>
