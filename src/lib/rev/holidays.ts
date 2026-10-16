import { addDays, dayKey } from './clock'

function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

const cache = new Map<number, Map<string, string>>()

/** Jours fériés français d'une année (clé AAAA-MM-JJ → nom) */
export function frenchHolidays(year: number): Map<string, string> {
  const hit = cache.get(year)
  if (hit) return hit
  const e = easter(year)
  const list: Array<[Date, string]> = [
    [new Date(year, 0, 1), 'Jour de l’an'],
    [addDays(e, 1), 'Lundi de Pâques'],
    [new Date(year, 4, 1), 'Fête du travail'],
    [new Date(year, 4, 8), 'Victoire 1945'],
    [addDays(e, 39), 'Ascension'],
    [addDays(e, 50), 'Lundi de Pentecôte'],
    [new Date(year, 6, 14), 'Fête nationale'],
    [new Date(year, 7, 15), 'Assomption'],
    [new Date(year, 10, 1), 'Toussaint'],
    [new Date(year, 10, 11), 'Armistice'],
    [new Date(year, 11, 25), 'Noël'],
  ]
  const map = new Map<string, string>()
  for (const [d, label] of list) map.set(dayKey(d), label)
  cache.set(year, map)
  return map
}

export function holidayName(d: Date): string | null {
  return frenchHolidays(d.getFullYear()).get(dayKey(d)) ?? null
}
