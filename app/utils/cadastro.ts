// Regras de formulário do cadastro de profissionais. As regras reais são do backend; aqui só orientamos a digitação.

const SEM_ACENTO = /[̀-ͯ]/g

/** Slug enquanto digita: minúsculas, sem acentos nem espaços (viram hífen), só [a-z0-9-], até 40. */
export function normalizarSlug(texto: string): string {
  return texto.normalize('NFD').replace(SEM_ACENTO, '').toLowerCase()
    .replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, 40)
}

/** Sugestão de slug a partir do nome de exibição (sem hífen sobrando no fim). */
export function sugerirSlug(nome: string): string {
  return normalizarSlug(nome).replace(/-$/, '')
}

/** 3 a 40 caracteres [a-z0-9-], sem hífen no começo ou no fim. */
export const slugValido = (slug: string) => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)

/** Usuário: minúsculo, sem acentos e só [a-z0-9._-], até 30. */
export function normalizarUsuario(texto: string): string {
  return texto.normalize('NFD').replace(SEM_ACENTO, '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30)
}
export const usuarioValido = (u: string) => /^[a-z0-9._-]{3,30}$/.test(u)

/** Dicas de senha (mínimo do Django = 8; as regras finais vêm do backend). */
export function checarSenha(senha: string, usuario: string) {
  return {
    tamanho: senha.length >= 8,
    naoNumerica: senha.length > 0 && !/^\d+$/.test(senha),
    diferenteUsuario: senha.length > 0 && senha.toLowerCase() !== usuario.toLowerCase(),
  }
}

/** 0 a 4: quantas dicas passam + 1 ponto por senha longa (12+). */
export function forcaSenha(senha: string, usuario: string): number {
  const c = checarSenha(senha, usuario)
  const base = Number(c.tamanho) + Number(c.naoNumerica) + Number(c.diferenteUsuario)
  return c.tamanho ? base + Number(senha.length >= 12) : Math.min(base, 1)
}
export const ROTULO_FORCA = ['', 'Fraca', 'Razoável', 'Boa', 'Forte']
