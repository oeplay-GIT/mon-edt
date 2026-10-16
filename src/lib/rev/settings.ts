import { clamp } from './clock'

export interface HolidayPeriod {
  id: string
  from: string
  to: string
  label: string
}

export interface SubjectPref {
  notes: string
  difficulty: number | null
}

export interface RevSettings {
  evalWords: string[]
  weekdayMin: number
  weekdayMax: number
  weekendMin: number
  weekendMax: number
  evalMax: number
  evalShare: number
  periods: HolidayPeriod[]
  subjects: Record<string, SubjectPref>
}

export const DEFAULT_EVAL_WORDS = ['ECC', 'Ctrl', 'DS', 'contrôle', 'partiel', 'évaluation']

export const DEFAULT_SETTINGS: RevSettings = {
  evalWords: DEFAULT_EVAL_WORDS,
  weekdayMin: 30,
  weekdayMax: 120,
  weekendMin: 240,
  weekendMax: 720,
  evalMax: 180,
  evalShare: 0.6,
  periods: [],
  subjects: {},
}

const KEY = 'edt:rev'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback
  return clamp(n, min, max)
}

function step10(n: number): number {
  return Math.round(n / 10) * 10
}

export function sanitizeSettings(raw: unknown): RevSettings {
  const d = DEFAULT_SETTINGS
  if (!isRecord(raw)) {
    return { ...d, evalWords: [...d.evalWords], periods: [], subjects: {} }
  }

  const evalWords = Array.isArray(raw.evalWords)
    ? raw.evalWords
        .filter((w): w is string => typeof w === 'string')
        .map((w) => w.trim())
        .filter(Boolean)
        .slice(0, 50)
    : [...d.evalWords]

  const weekdayMin = step10(num(raw.weekdayMin, d.weekdayMin, 10, 240))
  const weekdayMax = Math.max(weekdayMin, step10(num(raw.weekdayMax, d.weekdayMax, 10, 360)))
  const weekendMin = step10(num(raw.weekendMin, d.weekendMin, 0, 1200))
  const weekendMax = Math.max(weekendMin, step10(num(raw.weekendMax, d.weekendMax, 30, 1200)))
  const evalMax = Math.max(120, step10(num(raw.evalMax, d.evalMax, 120, 600)))
  const evalShare = Math.round(num(raw.evalShare, d.evalShare, 0.2, 1) * 100) / 100

  const periods: HolidayPeriod[] = []
  if (Array.isArray(raw.periods)) {
    for (const p of raw.periods) {
      if (!isRecord(p)) continue
      const from = typeof p.from === 'string' && DATE_RE.test(p.from) ? p.from : null
      const to = typeof p.to === 'string' && DATE_RE.test(p.to) ? p.to : null
      if (!from || !to) continue
      const [a, b] = from <= to ? [from, to] : [to, from]
      periods.push({
        id: typeof p.id === 'string' && p.id ? p.id : `${a}_${b}`,
        from: a,
        to: b,
        label: typeof p.label === 'string' ? p.label.slice(0, 60) : '',
      })
    }
  }

  const subjects: Record<string, SubjectPref> = {}
  if (isRecord(raw.subjects)) {
    for (const [k, v] of Object.entries(raw.subjects)) {
      if (!isRecord(v)) continue
      const notes = typeof v.notes === 'string' ? v.notes.slice(0, 300) : ''
      const difficulty =
        typeof v.difficulty === 'number' && Number.isFinite(v.difficulty)
          ? clamp(v.difficulty, 1, 5)
          : null
      subjects[k.slice(0, 40)] = { notes, difficulty }
    }
  }

  return {
    evalWords: evalWords.length > 0 ? evalWords : [...d.evalWords],
    weekdayMin,
    weekdayMax,
    weekendMin,
    weekendMax,
    evalMax,
    evalShare,
    periods,
    subjects,
  }
}

export function loadSettings(): RevSettings {
  try {
    const txt = localStorage.getItem(KEY)
    return sanitizeSettings(txt ? JSON.parse(txt) : null)
  } catch {
    return sanitizeSettings(null)
  }
}

export function saveSettings(s: RevSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // stockage plein ou indisponible : on ignore
  }
}
