/**
 * Lembra, neste aparelho, os tokens dos agendamentos feitos (até 5 por profissional).
 * Tudo em try/catch: sem localStorage (modo privado, bloqueio) o app continua funcionando.
 */
interface Guardado { token: string, salvo_em: string }

const LIMITE = 5

export function useAgendamentosLocais(slug: string) {
  const chave = `bela:agendamentos:${slug}`

  function ler(): Guardado[] {
    try {
      const bruto = localStorage.getItem(chave)
      const lista = bruto ? JSON.parse(bruto) as unknown : []
      return Array.isArray(lista)
        ? lista.filter((g): g is Guardado => typeof g?.token === 'string' && typeof g?.salvo_em === 'string').slice(0, LIMITE)
        : []
    }
    catch {
      return []
    }
  }

  function escrever(lista: Guardado[]) {
    try {
      localStorage.setItem(chave, JSON.stringify(lista.slice(0, LIMITE)))
    }
    catch { /* sem storage: segue sem lembrar */ }
  }

  function adicionar(token: string) {
    escrever([{ token, salvo_em: new Date().toISOString() }, ...ler().filter(g => g.token !== token)])
  }

  function remover(token: string) {
    escrever(ler().filter(g => g.token !== token))
  }

  return { ler, adicionar, remover }
}
