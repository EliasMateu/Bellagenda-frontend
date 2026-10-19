// Datas como strings AAAA-MM-DD, sem new Date(string) ambíguo e sem conversão de fuso:
// o calendário é tratado como "calendário civil" (UTC só como régua de dias).

export function partesYmd(ymd: string): [number, number, number] {
  const [y = 1970, m = 1, d = 1] = ymd.split('-').map(Number)
  return [y, m, d]
}

export function montarYmd(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10)
}

export function diasNoMes(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** 0 = domingo ... 6 = sábado. */
export function diaDaSemana(ymd: string): number {
  const [y, m, d] = partesYmd(ymd)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function somarMeses(ymd: string, n: number): string {
  const [y, m, d] = partesYmd(ymd)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return montarYmd(ny, nm, Math.min(d, diasNoMes(ny, nm)))
}

export function domingoDaSemana(ymd: string): string {
  return somarDias(ymd, -diaDaSemana(ymd))
}

const formatador = (opcoes: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...opcoes })
const FMT_SEMANA_CURTA = formatador({ weekday: 'short' })
const FMT_MES_CURTO = formatador({ month: 'short' })
const FMT_LONGA = formatador({ dateStyle: 'full' })
const FMT_MES_ANO = formatador({ month: 'long', year: 'numeric' })
const FMT_LETRA = formatador({ weekday: 'narrow' })
const FMT_SEMANA_LONGA = formatador({ weekday: 'long' })

const utc = (ymd: string) => {
  const [y, m, d] = partesYmd(ymd)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Ex.: "seg, 19 out 2026". */
export function formatarDataCurta(ymd: string): string {
  const dt = utc(ymd)
  const [y, , d] = partesYmd(ymd)
  const semana = FMT_SEMANA_CURTA.format(dt).replace('.', '')
  const mes = FMT_MES_CURTO.format(dt).replace('.', '')
  return `${semana}, ${d} ${mes} ${y}`
}

/** Ex.: "segunda-feira, 19 de outubro de 2026". */
export function formatarDataLonga(ymd: string): string {
  return FMT_LONGA.format(utc(ymd))
}

export function nomeMesAno(ymd: string): string {
  // Primeira letra maiúscula; o resto como o Intl pt-BR devolve ("Outubro de 2026").
  return FMT_MES_ANO.format(utc(ymd)).replace(/^./, c => c.toUpperCase())
}

/** Letras (D S T Q Q S S) e nomes dos dias, de domingo a sábado. */
export function letrasSemana(): { letra: string, nome: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Date.UTC(2026, 9, 18 + i)) // 18/10/2026 é domingo
    return { letra: FMT_LETRA.format(dt).toUpperCase(), nome: FMT_SEMANA_LONGA.format(dt) }
  })
}

export function numeroDoDia(ymd: string): number {
  return partesYmd(ymd)[2]
}

export function dataLocalDeHoje(): string {
  const d = new Date()
  return montarYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

const FMT_EXTENSO = formatador({ weekday: 'long', day: 'numeric', month: 'long' })

/** Ex.: "segunda-feira, 19 de outubro". */
export function formatarDataExtenso(ymd: string): string {
  return FMT_EXTENSO.format(utc(ymd))
}

/**
 * Contagem relativa até o início ("hoje às 14:30", "amanhã", "em 3 dias"), calculada no fuso do próprio ISO
 * (o ISO da API já traz o deslocamento da profissional). Retorna null se o horário já passou.
 */
export function contagemRelativa(iso: string, agora = Date.now()): string | null {
  if (new Date(iso).getTime() < agora) return null
  const m = iso.match(/([+-])(\d{2}):(\d{2})$/)
  const deslocamento = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  const hoje = new Date(agora + deslocamento * 60000).toISOString().slice(0, 10)
  const alvo = iso.slice(0, 10)
  const [ya, ma, da] = partesYmd(alvo)
  const [yb, mb, db] = partesYmd(hoje)
  const dias = Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86400000)
  if (dias === 0) return `hoje às ${iso.slice(11, 16)}`
  return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(dias, 'day')
}
