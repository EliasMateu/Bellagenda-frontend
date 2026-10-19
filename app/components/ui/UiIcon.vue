<script setup lang="ts">
/** Ícones próprios (SVG embutido, 24x24, traço 1.75, currentColor). Decorativos por padrão. */
export type NomeIcone =
  | 'calendario' | 'mais' | 'menu' | 'compartilhar' | 'copiar' | 'check' | 'chevron-esquerda'
  | 'chevron-direita' | 'chevron-baixo' | 'relogio' | 'usuario' | 'whatsapp' | 'servicos'
  | 'horarios' | 'calendario-check' | 'etiqueta' | 'lupa' | 'seta-direita' | 'agenda-relogio' | 'mais-opcoes' | 'filtro' | 'fechar' | 'alerta' | 'agenda-vazia' | 'pincel' | 'olho' | 'olho-fechado' | 'cadeado' | 'escudo-check' | 'contatos' | 'importar'

const RELOGIO = '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
const CALENDARIO = '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'

const FORMAS: Record<NomeIcone, string> = {
  'calendario': CALENDARIO,
  'mais': '<path d="M12 5v14M5 12h14"/>',
  'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
  'compartilhar': '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4"/>',
  'copiar': '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  'chevron-esquerda': '<path d="M14.5 6l-6 6 6 6"/>',
  'chevron-direita': '<path d="M9.5 6l6 6-6 6"/>',
  'chevron-baixo': '<path d="M6 9.5l6 6 6-6"/>',
  'relogio': RELOGIO,
  'usuario': '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/>',
  'whatsapp': '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-4.3A8.5 8.5 0 1 1 20.5 11.5z"/><path d="M9.2 9.2c.3 2.4 2.4 4.5 4.8 4.8l1.4-1.4-2-1-1 .8c-.8-.4-1.4-1-1.8-1.8l.8-1-1-2z"/>',
  'servicos': '<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="6.5" cy="6.5" r="2.5"/><path d="M8.5 8l11 9M8.5 16l11-9"/>',
  'horarios': RELOGIO,
  'calendario-check': `${CALENDARIO}<path d="M9.5 15l1.7 1.7 3.3-3.4"/>`,
  'etiqueta': '<path d="M12.5 3.5H5A1.5 1.5 0 0 0 3.5 5v7.5l8.2 8.2a1.5 1.5 0 0 0 2.1 0l6.9-6.9a1.5 1.5 0 0 0 0-2.1z"/><circle cx="8" cy="8" r="1.2"/>',
  'lupa': '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  'seta-direita': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'agenda-relogio': `<rect x="3.5" y="5" width="15" height="14" rx="2.5"/><path d="M3.5 10h15M8 3v4M14 3v4M7.5 13h.01M11 13h.01M7.5 16.5h.01"/><circle cx="17.5" cy="17.5" r="4" fill="var(--superficie)"/><path d="M17.5 15.5v2l1.3.8"/>`,
  'mais-opcoes': '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  'filtro': '<path d="M4 6h16M7 12h10M10 18h4"/>',
  'fechar': '<path d="M6 6l12 12M18 6L6 18"/>',
  'alerta': '<path d="M12 4l9 15.5H3L12 4z"/><path d="M12 10v4M12 17h.01"/>',
  'agenda-vazia': `${CALENDARIO}<path d="M9.5 15l1.7 1.7 3.3-3.4"/>`,
  'olho': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  'olho-fechado': '<path d="M3 3l18 18M10.6 5.7A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.5 7.2A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3.7-.8M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  'cadeado': '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5"/>',
  'escudo-check': '<path d="M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6L12 3z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
  'contatos': '<rect x="5.5" y="3.5" width="14" height="17" rx="2.5"/><circle cx="12.5" cy="10" r="2.5"/><path d="M8.5 16.5c.6-1.6 2-2.5 4-2.5s3.4.9 4 2.5M3 8h2.5M3 12h2.5M3 16h2.5"/>',
  'importar': '<path d="M12 4v10M7.5 10l4.5 4.5 4.5-4.5M5 19.5h14"/>',
  'pincel': '<path d="M19.5 4.5a2 2 0 0 0-2.8 0L10 11.2l2.8 2.8 6.7-6.7a2 2 0 0 0 0-2.8z"/><path d="M9.3 12.6C7 12.6 5.5 14 5.5 16c0 1.4-.7 2.4-2 3 3.5 1.3 8 .2 8-3.3"/>',
}

const props = withDefaults(defineProps<{ nome: NomeIcone, tamanho?: number, titulo?: string }>(), { tamanho: 24 })
const corpo = computed(() => FORMAS[props.nome])
</script>

<template>
  <svg
    class="icone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" :width="tamanho" :height="tamanho"
    fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
    :aria-hidden="titulo ? undefined : 'true'" :role="titulo ? 'img' : undefined" :aria-label="titulo" focusable="false"
  >
    <g v-html="corpo" />
  </svg>
</template>
