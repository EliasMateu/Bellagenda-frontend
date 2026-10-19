/**
 * Leitura de contatos para a importação (D-36), sem dependências e sem executar nada do arquivo:
 * o conteúdo é sempre tratado como texto. Nada aqui registra, guarda ou envia contatos.
 */

export interface Contato {
  nome: string
  telefone: string
}

export interface ResultadoLeitura {
  contatos: Contato[]
  /** true quando a leitura parou em LIMITE_LEITURA contatos. */
  truncado: boolean
}

export type CodigoErroLeitura = 'vazio' | 'grande_demais' | 'formato' | 'sem_telefone'

export class ErroLeitura extends Error {
  codigo: CodigoErroLeitura
  constructor(codigo: CodigoErroLeitura) {
    super(codigo)
    this.name = 'ErroLeitura'
    this.codigo = codigo
  }
}

export const LIMITE_BYTES = 5 * 1024 * 1024
export const LIMITE_LEITURA = 5000
export const LIMITE_POR_IMPORTACAO = 600
export const MAX_TELEFONE = 40
export const MAX_NOME = 200

export const MENSAGEM_ERRO_LEITURA: Record<CodigoErroLeitura, string> = {
  vazio: 'O arquivo está vazio.',
  grande_demais: 'O arquivo é grande demais (máximo de 5 MB). Exporte menos contatos e tente de novo.',
  formato: 'Não reconhecemos este arquivo. Envie um arquivo .vcf (vCard) ou .csv exportado dos seus contatos.',
  sem_telefone: 'Não encontramos telefones neste arquivo.',
}

// ---------------------------------------------------------------- utilidades

function limparNome(valor: string): string {
  // eslint-disable-next-line no-control-regex
  return valor.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NOME)
}

function limparTelefone(valor: string): string {
  let t = valor.trim().replace(/^tel:/i, '')
  t = (t.split(';')[0] ?? '').trim()
  t = t.replace(/[\s\-(). ]/g, '')
  return t.slice(0, MAX_TELEFONE)
}

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Bytes -> texto: UTF-8; se não for UTF-8 válido, Windows-1252 (CSV antigo do Excel). */
export function decodificarTexto(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  }
  catch {
    try {
      return new TextDecoder('windows-1252').decode(bytes)
    }
    catch {
      return new TextDecoder('utf-8').decode(bytes)
    }
  }
}

function montarContatos(nome: string, telefones: string[], saida: Contato[], limite: number): boolean {
  const nomeLimpo = limparNome(nome)
  const vistos = new Set<string>()
  for (const bruto of telefones) {
    const telefone = limparTelefone(bruto)
    if (!/\d/.test(telefone) || vistos.has(telefone)) continue
    vistos.add(telefone)
    if (saida.length >= limite) return true
    saida.push({ nome: nomeLimpo, telefone })
  }
  return false
}

// ---------------------------------------------------------------- vCard

function decodificarQp(valor: string, charset: string): string {
  const bytes: number[] = []
  for (let i = 0; i < valor.length; i++) {
    const c = valor[i] as string
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(valor.slice(i + 1, i + 3))) {
      bytes.push(Number.parseInt(valor.slice(i + 1, i + 3), 16))
      i += 2
    }
    else {
      const cod = valor.charCodeAt(i)
      if (cod < 128) bytes.push(cod)
      else bytes.push(...new TextEncoder().encode(c))
    }
  }
  try {
    return new TextDecoder(charset).decode(Uint8Array.from(bytes))
  }
  catch {
    return new TextDecoder('utf-8').decode(Uint8Array.from(bytes))
  }
}

function desescapar(valor: string): string {
  return valor.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? ' ' : c))
}

/** Separa "NOME;PARAMS" do valor no primeiro ":" fora de aspas. */
function separarLinha(linha: string): { esquerda: string, valor: string } | null {
  let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') aspas = !aspas
    else if (c === ':' && !aspas) return { esquerda: linha.slice(0, i), valor: linha.slice(i + 1) }
  }
  return null
}

function desdobrar(texto: string): string[] {
  const linhas = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')
  const saida: string[] = []
  for (const linha of linhas) {
    const anterior = saida.length - 1
    const ultima = saida[anterior]
    if (ultima !== undefined && /^[ \t]/.test(linha)) {
      saida[anterior] = ultima + linha.slice(1)
    }
    else if (ultima !== undefined && /QUOTED-PRINTABLE/i.test(ultima.split(':')[0] ?? '') && ultima.endsWith('=')) {
      saida[anterior] = ultima.slice(0, -1) + linha // quebra suave do quoted-printable
    }
    else {
      saida.push(linha)
    }
  }
  return saida
}

/** vCard 2.1, 3.0 e 4.0. Contatos sem telefone são ignorados; um contato por telefone. */
export function lerVcf(texto: string, limite = LIMITE_LEITURA): ResultadoLeitura {
  const contatos: Contato[] = []
  let truncado = false
  let dentro = false
  let fn = ''
  let n = ''
  let tels: string[] = []

  for (const linha of desdobrar(texto)) {
    const bruta = linha.trim()
    if (!bruta) continue
    const partes = separarLinha(bruta)
    if (!partes) continue
    const [nomeComGrupo = '', ...params] = partes.esquerda.split(';')
    const nomeProp = (nomeComGrupo.split('.').pop() ?? '').toUpperCase()
    const paramsMaiusc = params.join(';').toUpperCase()

    if (nomeProp === 'BEGIN' && partes.valor.trim().toUpperCase() === 'VCARD') {
      dentro = true
      fn = ''
      n = ''
      tels = []
      continue
    }
    if (nomeProp === 'END' && partes.valor.trim().toUpperCase() === 'VCARD') {
      if (dentro) {
        const nome = fn || n
        if (montarContatos(nome, tels, contatos, limite)) {
          truncado = true
          break
        }
      }
      dentro = false
      continue
    }
    if (!dentro) continue
    if (nomeProp !== 'FN' && nomeProp !== 'N' && nomeProp !== 'TEL') continue

    let valor = partes.valor
    if (paramsMaiusc.includes('QUOTED-PRINTABLE')) {
      const cs = /CHARSET=([A-Z0-9_-]+)/.exec(paramsMaiusc)?.[1] ?? 'UTF-8'
      valor = decodificarQp(valor, cs)
    }

    if (nomeProp === 'FN') {
      if (!fn) fn = limparNome(desescapar(valor))
    }
    else if (nomeProp === 'N') {
      if (!n) {
        const [sobrenome = '', nomeProprio = '', adicional = ''] = valor.split(';')
        n = limparNome([nomeProprio, adicional, sobrenome].map(desescapar).join(' '))
      }
    }
    else {
      tels.push(desescapar(valor))
    }
  }
  return { contatos, truncado }
}

// ---------------------------------------------------------------- CSV

function detectarDelimitador(texto: string): string {
  let aspas = false
  const cont: Record<string, number> = { ',': 0, ';': 0, '\t': 0 }
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i] as string
    if (c === '"') aspas = !aspas
    else if (!aspas && c === '\n') break
    else if (!aspas && c in cont) cont[c] = (cont[c] ?? 0) + 1
  }
  let melhor = ','
  for (const d of [';', '\t']) if ((cont[d] ?? 0) > (cont[melhor] ?? 0)) melhor = d
  return melhor
}

/** Tabela de linhas e colunas com aspas, aspas duplas escapadas e quebras de linha dentro de aspas. */
function linhasCsv(texto: string, delimitador: string, maxLinhas: number): string[][] {
  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false
  const fechaLinha = () => {
    linha.push(campo)
    campo = ''
    if (linha.some(c => c.trim() !== '')) linhas.push(linha)
    linha = []
  }
  for (let i = 0; i < texto.length && linhas.length < maxLinhas; i++) {
    const c = texto[i] as string
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i++
        }
        else {
          aspas = false
        }
      }
      else {
        campo += c
      }
    }
    else if (c === '"' && campo === '') aspas = true
    else if (c === delimitador) {
      linha.push(campo)
      campo = ''
    }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fechaLinha()
    }
    else {
      campo += c
    }
  }
  if (linhas.length < maxLinhas && (campo !== '' || linha.length)) fechaLinha()
  return linhas
}

const COLUNAS_NOME_COMPLETO = new Set([
  'name', 'display name', 'full name', 'nome', 'nome completo', 'nome de exibicao', 'nome para exibicao', 'nome de exibicao normalizado',
])
const COLUNAS_PRIMEIRO = new Set(['first name', 'given name', 'primeiro nome', 'nome proprio', 'nome', 'nome dado'])
const COLUNAS_SOBRENOME = new Set(['last name', 'family name', 'sobrenome', 'ultimo nome', 'nome de familia'])
const COLUNAS_MEIO = new Set(['middle name', 'additional name', 'nome do meio'])

function ehColunaTelefone(cab: string): boolean {
  return /(phone|tel|fone|celular|mobile|whatsapp)/.test(cab)
    && !/(phonetic|fonetic|label|type|tipo|rotulo|etiqueta)/.test(cab)
}

/** CSV do Google Contatos (inglês e português) e variantes genéricas. Sem cabeçalho reconhecido: ErroLeitura('formato'). */
export function lerCsv(texto: string, limite = LIMITE_LEITURA): ResultadoLeitura {
  const limpo = texto.replace(/^﻿/, '')
  const tabela = linhasCsv(limpo, detectarDelimitador(limpo), limite + 2)
  const cabecalho = tabela[0]
  if (!cabecalho) return { contatos: [], truncado: false }
  const cab = cabecalho.map(c => semAcento(c).toLowerCase().replace(/\s+/g, ' ').trim())

  const colsTel = cab.flatMap((c, i) => (ehColunaTelefone(c) ? [i] : []))
  if (!colsTel.length) throw new ErroLeitura('formato')
  const achar = (conjunto: Set<string>) => cab.findIndex(c => conjunto.has(c))
  const iSobrenome = achar(COLUNAS_SOBRENOME)
  const iMeio = achar(COLUNAS_MEIO)
  // "Nome" sozinho é o nome completo; com "Sobrenome" ao lado é só o primeiro nome.
  const iCompleto = cab.findIndex(c => COLUNAS_NOME_COMPLETO.has(c) && !(c === 'nome' && iSobrenome >= 0))
  const iPrimeiro = achar(COLUNAS_PRIMEIRO)

  const contatos: Contato[] = []
  let truncado = false
  for (const linha of tabela.slice(1)) {
    const celula = (i: number) => (i >= 0 ? (linha[i] ?? '').trim() : '')
    const nome = celula(iCompleto) || [celula(iPrimeiro), celula(iMeio), celula(iSobrenome)].filter(Boolean).join(' ')
    const telefones = colsTel.flatMap(i => (linha[i] ?? '').split(':::'))
    if (montarContatos(nome, telefones, contatos, limite)) {
      truncado = true
      break
    }
  }
  return { contatos, truncado }
}

// ---------------------------------------------------------------- entrada comum

/** Escolhe o leitor pelo conteúdo (e pela extensão) e traduz resultados vazios em erros amigáveis. */
export function lerArquivoTexto(nomeArquivo: string, texto: string): ResultadoLeitura {
  const semBom = texto.replace(/^﻿/, '')
  if (!semBom.trim()) throw new ErroLeitura('vazio')
  const pareceVcf = /^\s*BEGIN:VCARD/i.test(semBom) || (/\.vcf$/i.test(nomeArquivo) && /BEGIN:VCARD/i.test(semBom))
  if (pareceVcf) {
    const r = lerVcf(semBom)
    if (!r.contatos.length) throw new ErroLeitura('sem_telefone')
    return r
  }
  if (/\.vcf$/i.test(nomeArquivo)) throw new ErroLeitura('formato')
  const r = lerCsv(semBom)
  if (!r.contatos.length) throw new ErroLeitura('sem_telefone')
  return r
}

/** Resultado de navigator.contacts.select(['name','tel']): um contato por telefone. */
export function contatosDoSeletor(
  lista: ReadonlyArray<{ name?: string[], tel?: string[] }>,
  limite = LIMITE_LEITURA,
): ResultadoLeitura {
  const contatos: Contato[] = []
  let truncado = false
  for (const c of lista) {
    const nome = Array.isArray(c.name) && typeof c.name[0] === 'string' ? c.name[0] : ''
    const tels = Array.isArray(c.tel) ? c.tel.filter((t): t is string => typeof t === 'string') : []
    if (montarContatos(nome, tels, contatos, limite)) {
      truncado = true
      break
    }
  }
  return { contatos, truncado }
}
