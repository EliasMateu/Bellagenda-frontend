/**
 * Posiciona um popover "fixed" junto ao gatilho (evita corte por overflow de ancestrais),
 * inverte para cima se faltar espaço e fecha ao clicar fora, rolar a página ou redimensionar.
 */
export function usePopoverFixo(
  gatilho: Ref<HTMLElement | null>,
  painel: Ref<HTMLElement | null>,
  aberto: Ref<boolean>,
  opcoes: { alinharDireita?: boolean, larguraMinima?: number } = {},
) {
  const estilo = ref<Record<string, string>>({})

  function posicionar() {
    const el = gatilho.value
    if (!el) return
    const r = el.getBoundingClientRect()
    const abaixo = window.innerHeight - r.bottom
    const acima = r.top
    const abrirAcima = abaixo < 240 && acima > abaixo
    const maxAltura = Math.max(160, Math.min(320, (abrirAcima ? acima : abaixo) - 12))
    const largura = Math.max(r.width, opcoes.larguraMinima ?? 0)
    let esquerda = opcoes.alinharDireita ? r.right - largura : r.left
    esquerda = Math.max(8, Math.min(esquerda, window.innerWidth - largura - 8))
    estilo.value = {
      position: 'fixed',
      left: `${esquerda}px`,
      minWidth: `${largura}px`,
      maxHeight: `${maxAltura}px`,
      ...(abrirAcima ? { bottom: `${window.innerHeight - r.top + 4}px` } : { top: `${r.bottom + 4}px` }),
    }
  }

  function aoRolar(e: Event) {
    if (painel.value?.contains(e.target as Node)) return
    aberto.value = false
  }
  function aoFechar() {
    aberto.value = false
  }
  function aoPressionar(e: PointerEvent) {
    const alvo = e.target as Node
    if (painel.value?.contains(alvo) || gatilho.value?.contains(alvo)) return
    aberto.value = false
  }

  function ouvir() {
    window.addEventListener('scroll', aoRolar, true)
    window.addEventListener('resize', aoFechar)
    document.addEventListener('pointerdown', aoPressionar)
  }
  function desouvir() {
    window.removeEventListener('scroll', aoRolar, true)
    window.removeEventListener('resize', aoFechar)
    document.removeEventListener('pointerdown', aoPressionar)
  }

  watch(aberto, (v) => {
    if (v) {
      posicionar()
      ouvir()
    }
    else {
      desouvir()
    }
  })
  onBeforeUnmount(desouvir)

  return { estilo, posicionar }
}
