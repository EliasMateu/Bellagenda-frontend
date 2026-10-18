/**
 * Formata telefone brasileiro para exibição, sem dependências.
 * +5515997402280 -> +55 (15) 99740-2280; 15997402280 -> (15) 99740-2280.
 * Números fora do padrão voltam como vieram.
 */
/** Máscara enquanto digita: (15) 99740-2280 (até 11 dígitos). */
export function mascararTelefoneBR(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  const resto = d.slice(2)
  if (resto.length <= 4) return `(${d.slice(0, 2)}) ${resto}`
  const corte = d.length === 11 ? 5 : 4
  return `(${d.slice(0, 2)}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}

export function formatarTelefoneBR(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '')
  if (bruto.trim().startsWith('+') && !digitos.startsWith('55')) return bruto // internacional: não mexe
  const comPais = digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)
  const nacional = comPais ? digitos.slice(2) : digitos
  if (nacional.length !== 10 && nacional.length !== 11) return bruto
  const ddd = nacional.slice(0, 2)
  const numero = nacional.slice(2)
  const corte = numero.length - 4
  return `${comPais ? '+55 ' : ''}(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`
}
