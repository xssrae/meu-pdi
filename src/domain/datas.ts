// Aritmética de datas de calendário (`YYYY-MM-DD`), sem fuso: tudo em UTC.

import type { DataISO } from './types'

function utc(data: DataISO): number {
  const [a, m, d] = data.split('-').map(Number)
  return Date.UTC(a!, m! - 1, d!)
}

function iso(ms: number): DataISO {
  return new Date(ms).toISOString().slice(0, 10)
}

export function somarDias(data: DataISO, dias: number): DataISO {
  return iso(utc(data) + dias * 86_400_000)
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(data: DataISO): number {
  return new Date(utc(data)).getUTCDay()
}

/** Segunda-feira da semana da data (semana de segunda a domingo). */
export function inicioDaSemana(data: DataISO): DataISO {
  return somarDias(data, -((diaDaSemana(data) + 6) % 7))
}

/** `2026-10-15` → `2026-10` */
export function mesDe(data: DataISO): string {
  return data.slice(0, 7)
}

/** `2026-12`, 1 → `2027-01` */
export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number)
  return iso(Date.UTC(a!, m! - 1 + n, 1)).slice(0, 7)
}

/** Primeiro e último dia do mês `YYYY-MM`. */
export function limitesDoMes(mes: string): { inicio: DataISO; fim: DataISO } {
  const [a, m] = mes.split('-').map(Number)
  return { inicio: iso(Date.UTC(a!, m! - 1, 1)), fim: iso(Date.UTC(a!, m!, 0)) }
}

/** Dias da grade mensal, de segunda a domingo, em semanas completas. */
export function gradeDoMes(mes: string): DataISO[] {
  const { inicio, fim } = limitesDoMes(mes)
  const primeiro = inicioDaSemana(inicio)
  const ultimo = somarDias(inicioDaSemana(fim), 6)
  const dias: DataISO[] = []
  for (let d = primeiro; d <= ultimo; d = somarDias(d, 1)) dias.push(d)
  return dias
}

/** Aceita só `YYYY-MM-DD` que existe no calendário. */
export function dataValida(valor: string | null | undefined): valor is DataISO {
  return !!valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) && iso(utc(valor)) === valor
}

/** Aceita só `YYYY-MM` com mês de 01 a 12. */
export function mesValido(valor: string | null | undefined): valor is string {
  return !!valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor)
}
