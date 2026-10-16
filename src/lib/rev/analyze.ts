import type { Course } from '../../types'

export type Kind = 'CM' | 'TD' | 'TP' | 'COURS' | 'SOUTIEN' | 'AUTRE'
export type Nature = 'Th' | 'TP' | 'TD' | 'Autre'

export interface CourseInfo {
  /** Code matière ADE, ex. RES105 (null si aucune) */
  key: string | null
  /** Nom de la matière lu dans le titre (peut être vide) */
  name: string
  kind: Kind
  isExam: boolean
  nature: Nature
  /** Compte pour les révisions ? */
  counted: boolean
  /** Raison de l'exclusion (null si compté) */
  reason: string | null
}

export interface Analyzed {
  course: Course
  info: CourseInfo
}

const KEY_RE = /\b(RES|SAE)\s?(\d{3})/i
const TYPE_RE = /(?:^|[^A-Za-z0-9])(CM|TD|TP)(?![A-Za-z])/
const SOUTIEN_RE = /soutien/i
const AUTRE_RE = /autre\s+activit/i
const EXAM_RE = /\bexam(?:en)?s?\b/

export function normText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function tokens(s: string): string[] {
  return normText(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
}

/** Vrai si l'un des mots (ou expressions) apparaît tel quel dans le texte */
export function matchesWords(text: string, words: string[]): boolean {
  const t = tokens(text)
  for (const w of words) {
    const p = tokens(w)
    if (p.length === 0) continue
    for (let i = 0; i + p.length <= t.length; i++) {
      let ok = true
      for (let j = 0; j < p.length; j++) {
        const a = t[i + j]
        const b = p[j]
        if (a !== b && a !== `${b}s`) {
          ok = false
          break
        }
      }
      if (ok) return true
    }
  }
  return false
}

function typeOf(t: string | undefined): 'CM' | 'TD' | 'TP' | null {
  if (t === 'CM') return 'CM'
  if (t === 'TD') return 'TD'
  if (t === 'TP') return 'TP'
  return null
}

function natureOf(raw: string): Nature {
  if (/\btp\b/i.test(raw)) return 'TP'
  if (/\btd\b/i.test(raw)) return 'TD'
  if (/\bth\b|\bth[eé]or|\bcm\b/i.test(raw)) return 'Th'
  return 'Autre'
}

function cleanName(raw: string): string {
  const s = raw
    .replace(/\b(?:RES|SAE)\s?\d{3}\w*/gi, ' ')
    .replace(/(?:^|[^A-Za-z0-9])(?:CM|TD|TP)(?![A-Za-z])(?:\s*\d+\s*\/\s*\w+)?/g, ' ')
    .replace(/soutien(?:\s*\d+\s*\/\s*\w+)?/gi, ' ')
    .replace(/\bexam\w*/gi, ' ')
    .replace(/[_\-–—|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s.length >= 3 ? s : ''
}

export function analyze(course: Course, words: string[]): CourseInfo {
  const raw = [course.title, course.subtitle].filter(Boolean).join(' ').trim()
  const km = KEY_RE.exec(raw)
  const key = km ? `${(km[1] ?? '').toUpperCase()}${km[2] ?? ''}` : null
  const soutien = SOUTIEN_RE.test(raw)
  const autre = AUTRE_RE.test(raw)
  const type = typeOf(TYPE_RE.exec(raw)?.[1])
  const isExam = !soutien && !autre && (EXAM_RE.test(normText(raw)) || matchesWords(raw, words))

  let kind: Kind
  if (soutien) kind = 'SOUTIEN'
  else if (autre) kind = 'AUTRE'
  else if (type) kind = type
  else kind = key ? 'COURS' : 'AUTRE'

  let reason: string | null = null
  if (isExam) reason = 'Évaluation'
  else if (soutien) reason = 'Soutien'
  else if (autre) reason = 'Autre activité'
  else if (!key) reason = 'Hors matières'
  else if (!(course.teacher ?? '').trim()) reason = 'Sans enseignant'

  return {
    key,
    name: cleanName(raw),
    kind,
    isExam,
    nature: isExam ? natureOf(raw) : 'Autre',
    counted: reason === null,
    reason,
  }
}

export function analyzeAll(courses: Course[], words: string[]): Analyzed[] {
  return courses.map((course) => ({ course, info: analyze(course, words) }))
}
