// Geração de arquivo .ics (RFC 5545) no navegador, sem dependências.

const utcCompacto = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const escapar = (texto: string) =>
  texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Linhas com mais de 75 caracteres são "dobradas" (CRLF + espaço).
function dobrar(linha: string): string {
  const partes: string[] = []
  let resto = linha
  while (resto.length > 73) {
    partes.push(resto.slice(0, 73))
    resto = ` ${resto.slice(73)}`
  }
  partes.push(resto)
  return partes.join('\r\n')
}

export function gerarIcs(ev: { uid: string, inicio: string, fim: string, resumo: string, descricao?: string }): string {
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bela Agenda//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${utcCompacto(new Date().toISOString())}`,
    `DTSTART:${utcCompacto(ev.inicio)}`,
    `DTEND:${utcCompacto(ev.fim)}`,
    `SUMMARY:${escapar(ev.resumo)}`,
    ...(ev.descricao ? [`DESCRIPTION:${escapar(ev.descricao)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${linhas.map(dobrar).join('\r\n')}\r\n`
}

export function baixarArquivo(nome: string, conteudo: string, mime: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
