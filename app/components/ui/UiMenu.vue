<script setup lang="ts">
/**
 * Botão de menu (WAI-ARIA menu button).
 * Botão: Enter/Espaço/Seta para baixo abrem no primeiro item; Seta para cima abre no último.
 * Menu: setas movem (circular), Home/End, letras (digitação), Esc fecha e devolve o foco ao botão,
 * Tab fecha, clique fora fecha, Enter/Espaço/clique ativam o item.
 */
import type { UiMenuItem } from '~/utils/ui'

const props = defineProps<{
  label: string
  items: UiMenuItem[]
  title?: string
  ariaLabel?: string
  align?: 'left' | 'right'
  buttonClass?: string
}>()
const emit = defineEmits<{ select: [id: string] }>()

const aberto = ref(false)
const botao = ref<HTMLElement | null>(null)
const lista = ref<HTMLElement | null>(null)
const idMenu = useId()
const { estilo } = usePopoverFixo(botao, lista, aberto, { alinharDireita: props.align === 'right', larguraMinima: 220 })

function itensEl(): HTMLElement[] {
  return lista.value ? [...lista.value.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')] : []
}

async function abrir(ultimo = false) {
  aberto.value = true
  await nextTick()
  const els = itensEl()
  ;(ultimo ? els[els.length - 1] : els[0])?.focus()
}

function fechar(devolverFoco = true) {
  aberto.value = false
  if (devolverFoco) botao.value?.focus()
}

function aoClicarBotao() {
  if (aberto.value) fechar()
  else void abrir()
}

function aoTeclarBotao(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    void abrir()
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    void abrir(true)
  }
}

let buffer = ''
let limpar: ReturnType<typeof setTimeout> | undefined

function aoTeclarLista(e: KeyboardEvent) {
  const els = itensEl()
  const i = els.indexOf(document.activeElement as HTMLElement)
  const ir = (n: number) => {
    e.preventDefault()
    els[(n + els.length) % els.length]?.focus()
  }
  switch (e.key) {
    case 'ArrowDown': return ir(i + 1)
    case 'ArrowUp': return ir(i < 0 ? els.length - 1 : i - 1)
    case 'Home': return ir(0)
    case 'End': return ir(els.length - 1)
    case 'Escape':
      e.preventDefault()
      e.stopPropagation()
      return fechar()
    case 'Tab':
      return fechar() // o foco vai ao botão e o Tab segue para o próximo elemento
    default:
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += normalizar(e.key)
        clearTimeout(limpar)
        limpar = setTimeout(() => (buffer = ''), 600)
        const achado = els.find(el => normalizar(el.textContent ?? '').trim().startsWith(buffer))
        achado?.focus()
      }
  }
}

async function escolher(item: UiMenuItem) {
  if (item.disabled) return
  fechar()
  await nextTick()
  emit('select', item.id)
}
</script>

<template>
  <div class="menu-envoltorio">
    <button
      :id="`${idMenu}-botao`" ref="botao" type="button" :class="buttonClass ?? 'btn-secundario'"
      aria-haspopup="menu" :aria-expanded="aberto" :aria-controls="aberto ? idMenu : undefined"
      :aria-label="ariaLabel" @click="aoClicarBotao" @keydown="aoTeclarBotao"
    >
      <slot name="botao">
        {{ label }} <UiIcon nome="chevron-baixo" :tamanho="18" />
      </slot>
    </button>
    <div
      v-if="aberto" :id="idMenu" ref="lista" class="menu" role="menu" :aria-labelledby="`${idMenu}-botao`"
      :style="estilo" @keydown="aoTeclarLista"
    >
      <p v-if="title" class="menu-titulo" role="presentation">{{ title }}</p>
      <button
        v-for="item in items" :key="item.id" type="button" role="menuitem" tabindex="-1"
        class="menu-item" :class="{ perigo: item.danger }" :aria-disabled="item.disabled || undefined"
        @click="escolher(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
