export const DAY_MS = 86_400_000

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** 0 = lundi … 6 = dimanche */
export function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -isoWeekday(d))
}

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseKey(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Nombre de jours calendaires de a à b */
export function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS)
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** Arrondi à la tranche de 10 min supérieure */
export function ceil10(n: number): number {
  return Math.ceil(n / 10 - 1e-9) * 10
}

export function floor10(n: number): number {
  return Math.floor(n / 10 + 1e-9) * 10
}

/** 1090 → « 18 h 10 » */
export function fmtClock(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

/** 90 → « 1 h 30 », 45 → « 45 min » */
export function fmtDur(min: number): string {
  const r = Math.round(min)
  if (r < 60) return `${r} min`
  const h = Math.floor(r / 60)
  const m = r % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
