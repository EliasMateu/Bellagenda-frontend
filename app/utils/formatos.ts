/** Duração em minutos: 45 -> "45 min"; 60 -> "1 h"; 90 -> "1 h 30 min". */
export function formatarDuracao(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const resto = min % 60
  return resto ? `${h} h ${resto} min` : `${h} h`
}

/** Iniciais (até 2 letras) de um nome. */
export function iniciaisDe(nome: string): string {
  return nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '?'
}
