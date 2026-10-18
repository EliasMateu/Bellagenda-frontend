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
  return FMT_MES_ANO.format(utc(ymd))
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
