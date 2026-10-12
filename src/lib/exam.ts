const WORDS_KEY = 'edt:examWords'

export const DEFAULT_EXAM_WORDS = [
  'examen',
  'exam',
  'partiel',
  'ds',
  'cc',
  'controle',
  'soutenance',
  'tp note',
  'rattrapage',
  'epreuve',
  'qcm',
  'evaluation',
]

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// "ds1" -> "ds", "examens" -> "examen"
function stem(token: string): string {
  let t = token
  const letters = t.replace(/[0-9]+$/, '')
  if (letters.length >= 2 && letters !== t) t = letters
  if (t.length > 3 && t.endsWith('s')) t = t.slice(0, -1)
  return t
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem)
}

export function loadExamWords(): string[] {
  try {
    const raw = localStorage.getItem(WORDS_KEY)
    if (!raw) return DEFAULT_EXAM_WORDS
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((w): w is string => typeof w === 'string')
    }
  } catch {
    // ignore
  }
  return DEFAULT_EXAM_WORDS
}

export function saveExamWords(words: string[]): void {
  try {
    localStorage.setItem(WORDS_KEY, JSON.stringify(words))
  } catch {
    // ignore
  }
}

function collectText(course: object): string {
  return Object.values(course as Record<string, unknown>)
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
}

/** Renvoie une fonction qui dit si un cours est un examen. */
export function makeExamDetector(words: string[]): (course: object) => boolean {
  const phrases = words.map((w) => tokenize(w).join(' ')).filter(Boolean)
  return (course) => {
    if (phrases.length === 0) return false
    const padded = ' ' + tokenize(collectText(course)).join(' ') + ' '
    return phrases.some((p) => padded.includes(' ' + p + ' '))
  }
}

/** Intitulé lisible d'un cours (essaie les noms de champs usuels). */
export function courseLabel(course: object): string {
  const rec = course as Record<string, unknown>
  for (const key of ['title', 'name', 'summary', 'subject', 'label']) {
    const v = rec[key]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return ''
}
