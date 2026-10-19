<script setup lang="ts">
/**
 * Seleção própria (select-only combobox + listbox). v-model aceita string ou número.
 * Gatilho: clique, Enter, Espaço, Setas e Home/End abrem.
 * Lista aberta: Setas/Home/End movem a opção ativa (aria-activedescendant), digitar letras salta para
 * a opção que começa com o texto, Enter/Espaço selecionam, Esc fecha (foco volta ao gatilho), Tab fecha.
 * Mobile (< 768px) abre em UiSheet (o foco vai para a lista); desktop abre como popover junto ao gatilho.
 */
import type { UiOption } from '~/utils/ui'

const props = defineProps<{
  id?: string
  label?: string
  placeholder?: string
  options: UiOption[]
  erro?: boolean
  disabled?: boolean
  ariaLabel?: string
}>()
const modelo = defineModel<string | number | null>({ default: '' })

const uid = useId()
const idGatilho = computed(() => props.id ?? `${uid}-gatilho`)
const idLista = `${uid}-lista`
const aberto = ref(false)
const ativo = ref(0)
const movel = ref(true)
const gatilho = ref<HTMLElement | null>(null)
const popover = ref<HTMLElement | null>(null)
const listaSheet = ref<HTMLElement | null>(null)
const { estilo } = usePopoverFixo(gatilho, popover, aberto, { larguraMinima: 160 })

onMounted(() => {
  const mq = window.matchMedia('(min-width: 768px)')
  movel.value = !mq.matches
  mq.addEventListener('change', (e) => {
    movel.value = !e.matches
    aberto.value = false
  })
})

const selecionada = computed(() => props.options.find(o => String(o.value) === String(modelo.value)))
const idOpcao = (i: number) => `${uid}-op-${i}`
const idAtivo = computed(() => (aberto.value ? idOpcao(ativo.value) : undefined))

function habilitada(i: number) {
  return !props.options[i]?.disabled
}
function proxima(a: number, passo: 1 | -1) {
  const n = props.options.length
  for (let k = 1; k <= n; k++) {
    const i = (a + passo * k + n * 2) % n
    if (habilitada(i)) return i
  }
  return a
}

async function abrir(ondeComecar?: 'primeira' | 'ultima') {
  if (props.disabled || !props.options.length) return
  const sel = props.options.findIndex(o => String(o.value) === String(modelo.value))
  ativo.value = ondeComecar === 'ultima'
    ? proxima(0, -1)
    : ondeComecar === 'primeira' ? proxima(-1, 1) : (sel >= 0 ? sel : proxima(-1, 1))
  aberto.value = true
  await nextTick()
  rolarAtivo()
}

function fechar(devolverFoco = true) {
  aberto.value = false
  if (devolverFoco && !movel.value) gatilho.value?.focus()
}

function escolher(i: number) {
  const o = props.options[i]
  if (!o || o.disabled) return
  modelo.value = o.value
  fechar()
}

function rolarAtivo() {
  document.getElementById(idOpcao(ativo.value))?.scrollIntoView({ block: 'nearest' })
}

let buffer = ''
let temporizador: ReturnType<typeof setTimeout> | undefined
let suprimirAte = 0

function aoTeclar(e: KeyboardEvent) {
  const n = props.options.length
  if (!aberto.value) {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault()
      void abrir(e.key === 'ArrowUp' || e.key === 'End' ? 'ultima' : 'primeira')
    }
    return
  }
  const mover = (i: number) => {
    e.preventDefault()
    ativo.value = i
    nextTick(rolarAtivo)
  }
  switch (e.key) {
    case 'ArrowDown': return mover(proxima(ativo.value, 1))
    case 'ArrowUp': return mover(proxima(ativo.value, -1))
    case 'Home': return mover(proxima(-1, 1))
    case 'End': return mover(proxima(n, -1))
    case 'Enter':
    case ' ':
      e.preventDefault()
      suprimirAte = Date.now() + 400 // evita que o "click" do Espaço reabra a lista
      return escolher(ativo.value)
    case 'Escape':
      e.preventDefault()
      e.stopPropagation()
      return fechar()
    case 'Tab':
      return movel.value ? undefined : fechar(false) // na folha o Tab fica preso no diálogo
    default:
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += normalizar(e.key)
        clearTimeout(temporizador)
        temporizador = setTimeout(() => (buffer = ''), 600)
        const i = props.options.findIndex((o, k) => habilitada(k) && normalizar(o.label).startsWith(buffer))
        if (i >= 0) mover(i)
      }
  }
}

function aoClicarGatilho() {
  if (Date.now() < suprimirAte) return
  if (aberto.value) fechar()
  else void abrir()
}

// Sheet: foco vai para a lista (data-autofocus); fechar devolve o foco ao gatilho pelo próprio UiSheet.
</script>

<template>
  <div class="ui-select">
    <button
      :id="idGatilho" ref="gatilho" type="button" class="ui-gatilho" role="combobox" aria-haspopup="listbox"
      :aria-expanded="aberto" :aria-controls="aberto ? idLista : undefined" :aria-label="ariaLabel"
      :aria-activedescendant="aberto && !movel ? idAtivo : undefined" :aria-invalid="erro || undefined"
      :disabled="disabled" @click="aoClicarGatilho" @keydown="aoTeclar"
    >
      <span class="ui-valor" :class="{ 'ui-vazio': !selecionada }">{{ selecionada?.label ?? placeholder ?? 'Selecione' }}</span>
      <UiIcon nome="chevron-baixo" :tamanho="20" />
    </button>

    <UiSheet v-if="movel" v-model="aberto" :titulo="label ?? placeholder ?? 'Selecione'">
      <ul
        :id="idLista" ref="listaSheet" class="ui-lista" role="listbox" tabindex="0" data-autofocus
        :aria-label="label ?? placeholder" :aria-activedescendant="idAtivo" @keydown="aoTeclar"
      >
        <li
          v-for="(o, i) in options" :id="idOpcao(i)" :key="String(o.value)" class="ui-opcao" role="option"
          :aria-selected="String(o.value) === String(modelo)" :aria-disabled="o.disabled || undefined"
          :class="{ ativa: i === ativo, selecionada: String(o.value) === String(modelo) }"
          @click="escolher(i)" @pointermove="ativo = i"
        >
          <span class="ui-opcao-texto">{{ o.label }}<small v-if="o.desc">{{ o.desc }}</small></span>
          <UiIcon v-if="String(o.value) === String(modelo)" nome="check" :tamanho="20" />
        </li>
      </ul>
    </UiSheet>

    <ul
      v-else-if="aberto" :id="idLista" ref="popover" class="ui-lista ui-popover" role="listbox"
      :aria-label="label ?? placeholder" :style="estilo"
    >
      <li
        v-for="(o, i) in options" :id="idOpcao(i)" :key="String(o.value)" class="ui-opcao" role="option"
        :aria-selected="String(o.value) === String(modelo)" :aria-disabled="o.disabled || undefined"
        :class="{ ativa: i === ativo, selecionada: String(o.value) === String(modelo) }"
        @click="escolher(i)" @pointermove="ativo = i"
      >
        <span class="ui-opcao-texto">{{ o.label }}<small v-if="o.desc">{{ o.desc }}</small></span>
        <UiIcon v-if="String(o.value) === String(modelo)" nome="check" :tamanho="20" />
      </li>
    </ul>
  </div>
</template>
