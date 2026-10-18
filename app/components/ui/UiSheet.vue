<script setup lang="ts">
/**
 * Diálogo modal: folha de baixo no mobile, diálogo centralizado em >= 768px.
 * Teclas: Esc fecha; Tab/Shift+Tab ficam presos dentro do diálogo. Clique no fundo fecha.
 * Foco vai para [data-autofocus] (ou o primeiro item focável) e volta ao gatilho ao fechar.
 */
const aberto = defineModel<boolean>({ default: false })
defineProps<{ titulo: string }>()

const montado = ref(false) // Teleport só no cliente: o SSR renderiza fechado
onMounted(() => {
  montado.value = true
})

const painel = ref<HTMLElement | null>(null)
const idTitulo = useId()
let anterior: HTMLElement | null = null

watch(aberto, async (v, antes) => {
  if (v) {
    anterior = document.activeElement as HTMLElement | null
    travarRolagem()
    await nextTick()
    const alvo = painel.value?.querySelector<HTMLElement>('[data-autofocus]')
      ?? (painel.value ? elementosFocaveis(painel.value)[0] : undefined)
      ?? painel.value
    alvo?.focus()
  }
  else if (antes) {
    liberarRolagem()
    if (anterior?.isConnected) anterior.focus()
    anterior = null
  }
})

onBeforeUnmount(() => {
  if (aberto.value) liberarRolagem()
})

function fechar() {
  aberto.value = false
}

function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    fechar()
    return
  }
  if (e.key !== 'Tab' || !painel.value) return
  const itens = elementosFocaveis(painel.value)
  const primeiro = itens[0]
  const ultimo = itens[itens.length - 1]
  if (!primeiro || !ultimo) {
    e.preventDefault()
    return
  }
  const atual = document.activeElement
  if (e.shiftKey && (atual === primeiro || atual === painel.value)) {
    e.preventDefault()
    ultimo.focus()
  }
  else if (!e.shiftKey && atual === ultimo) {
    e.preventDefault()
    primeiro.focus()
  }
}
</script>

<template>
  <Teleport v-if="montado" to="body">
    <div v-if="aberto" class="sheet-fundo" @pointerdown.self="fechar">
      <div
        ref="painel" class="sheet" role="dialog" aria-modal="true" :aria-labelledby="idTitulo"
        tabindex="-1" @keydown="aoTeclar"
      >
        <header class="sheet-topo">
          <h2 :id="idTitulo">{{ titulo }}</h2>
          <button type="button" class="btn-secundario sheet-fechar" @click="fechar">
            <span aria-hidden="true">✕</span> Fechar
          </button>
        </header>
        <div class="sheet-corpo">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
