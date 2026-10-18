<script setup lang="ts">
import type { ClientePainel } from '~/composables/usePainel'

const api = usePainelApi()
const carga = useEnvio()
const envio = useEnvio()

const clientes = ref<ClientePainel[]>([])
const carregou = ref(false)
const busca = ref('')
const editando = ref<number | 'novo' | null>(null)
const form = reactive({ nome: '', telefone: '', observacoes: '' })

const folha = computed({
  get: () => editando.value !== null,
  set: (v: boolean) => {
    if (!v) editando.value = null
  },
})

let ultimaBusca = ''
async function carregar() {
  ultimaBusca = busca.value.trim()
  const r = await carga.executar(() => api.clientes.listar({ busca: busca.value.trim() || undefined }))
  if (r) clientes.value = r
  carregou.value = true
}

// Busca ao digitar (debounce de 300 ms) ou imediatamente com Enter / limpar.
let temporizador: ReturnType<typeof setTimeout> | undefined
watch(busca, () => {
  clearTimeout(temporizador)
  if (busca.value.trim() === ultimaBusca) return
  temporizador = setTimeout(carregar, 300)
})
function buscarAgora() {
  clearTimeout(temporizador)
  void carregar()
}
onBeforeUnmount(() => clearTimeout(temporizador))

function abrir(c?: ClientePainel) {
  envio.limpar()
  editando.value = c ? c.id : 'novo'
  form.nome = c?.nome ?? ''
  form.telefone = c?.telefone ?? ''
  form.observacoes = c?.observacoes ?? ''
}

async function salvar() {
  const corpo = { nome: form.nome.trim(), telefone: form.telefone.trim(), observacoes: form.observacoes.trim() }
  const id = editando.value
  const r = await envio.executar(() => (typeof id === 'number' ? api.clientes.editar(id, corpo) : api.clientes.criar(corpo)))
  if (r) {
    editando.value = null
    await carregar()
  }
  else {
    await envio.focarPrimeiroErro(['nome', 'telefone', 'observacoes'])
  }
}

const linkWa = (c: ClientePainel) => `https://wa.me/${c.telefone.replace(/\D/g, '')}`

onMounted(carregar)
</script>

<template>
  <section class="gestao">
    <GestaoCabecalho titulo="Clientes" acao="Nova cliente" @acao="abrir()" />

    <UiSearchField v-model="busca" label="Buscar por nome ou telefone" placeholder="Buscar por nome ou telefone" @enviar="buscarAgora" />

    <div v-if="!carregou && !carga.erro.value" role="status" class="esqueletos">
      <p class="somente-leitor">Carregando…</p>
      <div v-for="n in 3" :key="n" class="esqueleto esqueleto-cartao" aria-hidden="true" />
    </div>

    <div v-else-if="carga.erro.value && !clientes.length" class="estado-erro">
      <AvisoErro :mensagem="carga.erro.value" />
      <p><button type="button" class="btn-secundario" @click="carregar">Tentar de novo</button></p>
    </div>

    <UiEmpty
      v-else-if="!clientes.length && busca.trim()" icone="lupa" titulo="Nenhuma cliente encontrada"
      texto="Tente outro nome ou telefone." acao="Limpar busca" @acao="busca = ''; buscarAgora()"
    />
    <UiEmpty
      v-else-if="!clientes.length" icone="usuario" titulo="Nenhuma cliente ainda"
      texto="As clientes aparecem aqui quando agendam, ou você pode cadastrá-las." acao="Nova cliente" @acao="abrir()"
    />

    <ul v-else class="grade-gestao">
      <li v-for="c in clientes" :key="c.id" class="cartao-gestao cliente-card">
        <span class="avatar-cliente" aria-hidden="true">{{ iniciaisDe(c.nome) }}</span>
        <button type="button" class="cliente-area" :aria-label="`Editar ${c.nome}`" @click="abrir(c)">
          <span class="cg-nome">{{ c.nome }}</span>
          <span class="cg-sec">{{ formatarTelefoneBR(c.telefone) }}</span>
        </button>
        <a
          :href="linkWa(c)" class="btn btn-secundario btn-icone" target="_blank" rel="noopener noreferrer"
          aria-label="Chamar no WhatsApp" title="Chamar no WhatsApp"
        ><UiIcon nome="whatsapp" :tamanho="20" /></a>
      </li>
    </ul>

    <UiSheet v-model="folha" :titulo="editando === 'novo' ? 'Nova cliente' : 'Editar cliente'">
      <form @submit.prevent="salvar">
        <AvisoErro v-if="envio.erro.value" :mensagem="envio.erro.value" />
        <CampoForm id="nome" v-model="form.nome" label="Nome" required maxlength="100" data-autofocus :erros="envio.erros.value.nome" />
        <CampoForm id="telefone" v-model="form.telefone" tipo="tel" label="WhatsApp (com DDD)" inputmode="tel" required :erros="envio.erros.value.telefone" />
        <CampoForm id="observacoes" v-model="form.observacoes" tipo="textarea" label="Observações" :erros="envio.erros.value.observacoes" />
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
