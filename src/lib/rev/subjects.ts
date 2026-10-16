import { normText, type Analyzed } from './analyze'
import { clamp } from './clock'
import type { RevSettings } from './settings'

export interface Subject {
  key: string
  name: string
  difficulty: number
  defaultDifficulty: number
  notes: string
  defaultNotes: string
  average: number | null
  gradeCount: number
  /** A au moins un cours compté pour les révisions */
  counted: boolean
}

// Difficulté par défaut (1 = facile, 5 = très difficile), d'après le nom de la matière
const DIFFICULTY_RULES: Array<[RegExp, number]> = [
  [/signal|transmission|math/, 4.5],
  [/principe|architecture des reseaux/, 4],
  [/programmation|developpement/, 4],
  [/electronique/, 3.5],
  [/numerique/, 3.5],
  [/initiation.*reseau|reseaux informatiques/, 3],
  [/exploitation/, 3],
  [/\bweb\b|internet/, 2.5],
  [/anglais|english/, 2],
  [/\bia\b|intelligence artificielle/, 2],
  [/expression|communication/, 1.5],
  [/gestion de projet|gestion des projet/, 1.5],
  [/\bppp\b|projet personnel|professionnel/, 1],
]

// Notes de départ connues (modifiables ensuite dans l'appli)
const NOTE_SEEDS: Array<[RegExp, string]> = [
  [/exploitation/, '14,75'],
  [/numerique/, '9,50'],
  [/signal/, '6,00'],
]

export function defaultDifficulty(name: string): number {
  const n = normText(name)
  for (const [re, d] of DIFFICULTY_RULES) {
    if (re.test(n)) return d
  }
  return 3
}

export function defaultNotes(name: string): string {
  const n = normText(name)
  for (const [re, s] of NOTE_SEEDS) {
    if (re.test(n)) return s
  }
  return ''
}

/** Lit des notes du type « 6,00; 16,50 x2 » et calcule la moyenne pondérée */
export function parseGrades(text: string): { average: number | null; count: number } {
  let sum = 0
  let coefSum = 0
  let count = 0
  for (const part of text.split(/[;\n]+/)) {
    const m = part.match(/^\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:[x×*]\s*(\d+(?:[.,]\d+)?))?\s*$/i)
    if (!m) continue
    const g = parseFloat(m[1].replace(',', '.'))
    const c = m[2] ? parseFloat(m[2].replace(',', '.')) : 1
    if (!(g >= 0 && g <= 20) || !(c > 0)) continue
    sum += g * c
    coefSum += c
    count += 1
  }
  return { average: coefSum > 0 ? sum / coefSum : null, count }
}

const DIFFICULTY_POINTS: Array<[number, number]> = [
  [1, 0.8],
  [3, 1.2],
  [4.5, 1.5],
  [5, 1.6],
]

export function difficultyFactor(d: number): number {
  const x = clamp(d, 1, 5)
  for (let i = 1; i < DIFFICULTY_POINTS.length; i++) {
    const [x0, y0] = DIFFICULTY_POINTS[i - 1]
    const [x1, y1] = DIFFICULTY_POINTS[i]
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 1.6
}

export function noteFactor(avg: number | null): number {
  if (avg === null) return 1
  if (avg < 8) return 1.4
  if (avg < 10) return 1.25
  if (avg < 12) return 1
  if (avg < 14) return 0.85
  return 0.7
}

export function subjectFactor(s: Subject): number {
  return difficultyFactor(s.difficulty) * noteFactor(s.average)
}

export function buildSubjects(items: Analyzed[], settings: RevSettings): Map<string, Subject> {
  const keys = new Set<string>()
  const countedKeys = new Set<string>()
  const names = new Map<string, string>()
  const priority = new Map<string, number>()

  for (const a of items) {
    const { key, name, counted, isExam } = a.info
    
    // Correction ici : on ignore l'élément si la clé ou le nom est absent / vide
    if (!key || !name) continue

    keys.add(key)
    if (counted) countedKeys.add(key)
    // On préfère le nom d'un cours compté, puis celui d'un cours qui n'est pas un examen
    const p = counted ? 2 : isExam ? 0 : 1
    const current = priority.get(key)
    if (current === undefined || p > current) {
      names.set(key, name)
      priority.set(key, p)
    }
  }

  const sortedKeys = [...keys].sort()
  const result = new Map<string, Subject>()

  for (const key of sortedKeys) {
    const name = names.get(key) ?? key
    const defDiff = defaultDifficulty(name)
    const defNotes = defaultNotes(name)
    const pref = settings.subjects[key]
    const notes = pref ? pref.notes : defNotes
    const difficulty = pref && pref.difficulty !== null ? pref.difficulty : defDiff
    const { average, count } = parseGrades(notes)
    result.set(key, {
      key,
      name,
      difficulty,
      defaultDifficulty: defDiff,
      notes,
      defaultNotes: defNotes,
      average,
      gradeCount: count,
      counted: countedKeys.has(key),
    })
  }

  return result
}
