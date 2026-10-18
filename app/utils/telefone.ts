/**
 * Formata telefone brasileiro para exibição, sem dependências.
 * +5515997402280 -> +55 (15) 99740-2280; 15997402280 -> (15) 99740-2280.
 * Números fora do padrão voltam como vieram.
 */
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
