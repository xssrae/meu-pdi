// Formatação de datas para a interface (pt-BR, sem fuso: as datas são de calendário).

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function partes(data: string) {
  const [a, m, d] = data.split('-').map(Number)
  return { a: a!, m: m!, d: d! }
}

/** `2026-10-15` → `15 out` */
export function dataCurta(data: string): string {
  const { m, d } = partes(data)
  return `${String(d).padStart(2, '0')} ${MESES[m - 1]}`
}

/** `2026-10-15` → `out` e `15`, para o bloco de data do card da 1:1. */
export function mesEDia(data: string): { mes: string; dia: string } {
  const { m, d } = partes(data)
  return { mes: MESES[m - 1]!, dia: String(d) }
}

/** `2026-10-15` → `quinta` */
export function diaDaSemana(data: string): string {
  const { a, m, d } = partes(data)
  return DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]!
}

/** `2026-07-01`, `2026-12-31` → `jul–dez` */
export function intervaloMeses(inicio: string, fim: string): string {
  return `${MESES[partes(inicio).m - 1]}–${MESES[partes(fim).m - 1]}`
}

/** 4 → `em 4 dias`; 0 → `hoje`; 1 → `amanhã` */
export function emDias(n: number): string {
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  return `em ${n} dias`
}

/** `2026-10-15` → `15/10` (contador da barra lateral). */
export function diaMes(data: string): string {
  const { m, d } = partes(data)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

/** `2026-10` → `Outubro 2026` */
export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return `${capitalizar(MESES_EXTENSO[m! - 1]!)} ${a}`
}

/** `2026-10-15` → `Quinta, 15 out` */
export function diaPorExtenso(data: string): string {
  return `${capitalizar(diaDaSemana(data))}, ${dataCurta(data)}`
}

export function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** 1 → `1 feedback`; 3 → `3 feedbacks` */
export function plural(n: number, singular: string, pluralForma = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForma}`
}

const MESES_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
