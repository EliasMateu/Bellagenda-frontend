export interface UiOption {
  value: string | number
  label: string
  desc?: string
  disabled?: boolean
}

export interface UiMenuItem {
  id: string
  label: string
  danger?: boolean
  disabled?: boolean
}

const FOCAVEIS = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function elementosFocaveis(raiz: HTMLElement): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(el => el.offsetParent !== null || el === document.activeElement)
}

// Trava de rolagem do body com contador (folhas aninhadas).
let travas = 0
let overflowAnterior = ''

export function travarRolagem() {
  if (travas++ === 0) {
    overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
}

export function liberarRolagem() {
  travas = Math.max(0, travas - 1)
  if (travas === 0) document.body.style.overflow = overflowAnterior
}

/** Normaliza para busca por digitação (sem acentos, minúsculas). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
