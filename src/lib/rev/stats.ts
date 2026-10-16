import type { Analyzed, Kind } from './analyze'
import { addDays, dayKey, minutesOfDay, parseKey, startOfWeek } from './clock'
import { holidayName } from './holidays'
import type { Planner } from './planner'
import type { RevSettings } from './settings'
import type { Subject } from './subjects'

function minutesOf(a: Analyzed): number {
  return Math.max(0, Math.round((a.course.end.getTime() - a.course.start.getTime()) / 60000))
}

// ---------- Par matière ----------
export interface SubjectStat {
  key: string
  name: string
  sessions: Array<{ kind: Kind; total: number; done: number }>
  totalMin: number
  doneMin: number
  leftMin: number
  teachers: string[]
  average: number | null
  gradeCount: number
  difficulty: number
}

const KIND_ORDER: Kind[] = ['CM', 'TD', 'TP', 'COURS']

export function subjectStats(
  items: Analyzed[],
  subjects: Map<string, Subject>,
  now: Date,
): SubjectStat[] {
  const map = new Map<string, SubjectStat>()
  for (const it of items) {
    if (!it.info.counted || !it.info.key) continue
    const subj = subjects.get(it.info.key)
    if (!subj) continue
    let st = map.get(subj.key)
    if (!st) {
      st = {
        key: subj.key,
        name: subj.name,
        sessions: [],
        totalMin: 0,
        doneMin: 0,
        leftMin: 0,
        teachers: [],
        average: subj.average,
        gradeCount: subj.gradeCount,
        difficulty: subj.difficulty,
      }
      map.set(subj.key, st)
    }
    const m = minutesOf(it)
    const done = it.course.end.getTime() <= now.getTime()
    st.totalMin += m
    if (done) st.doneMin += m
    let s = st.sessions.find((x) => x.kind === it.info.kind)
    if (!s) {
      s = { kind: it.info.kind, total: 0, done: 0 }
      st.sessions.push(s)
    }
    s.total += 1
    if (done) s.done += 1
    const t = (it.course.teacher ?? '').trim()
    if (t && !st.teachers.includes(t)) st.teachers.push(t)
  }
  const out = [...map.values()]
  for (const st of out) {
    st.leftMin = st.totalMin - st.doneMin
    st.sessions.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
    st.teachers.sort((a, b) => a.localeCompare(b))
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

// ---------- Par semaine / jour ----------
export interface DayStat {
  key: string
  date: Date
  courseMin: number
  first: number | null
  last: number | null
  free: [number, number] | null
  closed: string | null
}

export interface WeekStat {
  start: Date
  courseMin: number
  vacation: boolean
  days: DayStat[]
}

export function weekStats(items: Analyzed[], planner: Planner): WeekStat[] {
  const first = planner.firstKey
  const last = planner.lastKey
  if (!first || !last) return []

  const byDay = new Map<string, Analyzed[]>()
  for (const it of items) {
    const k = dayKey(it.course.start)
    const list = byDay.get(k)
    if (list) list.push(it)
    else byDay.set(k, [it])
  }

  const out: WeekStat[] = []
  const end = parseKey(last)
  for (let ws = startOfWeek(parseKey(first)); ws.getTime() <= end.getTime(); ws = addDays(ws, 7)) {
    const days: DayStat[] = []
    let weekMin = 0
    for (let i = 0; i < 7; i++) {
      const date = addDays(ws, i)
      const key = dayKey(date)
      const evs = byDay.get(key) ?? []
      if (i >= 5 && evs.length === 0) continue
      let courseMin = 0
      let firstMin: number | null = null
      let lastMin: number | null = null
      for (const e of evs) {
        if (e.info.counted) courseMin += minutesOf(e)
        const s = minutesOfDay(e.course.start)
        const f = minutesOfDay(e.course.end)
        if (firstMin === null || s < firstMin) firstMin = s
        if (lastMin === null || f > lastMin) lastMin = f
      }
      weekMin += courseMin
      days.push({
        key,
        date,
        courseMin,
        first: firstMin,
        last: lastMin,
        free: planner.freeWindow(date),
        closed: planner.closedReason(date),
      })
    }
    out.push({ start: ws, courseMin: weekMin, vacation: planner.isVacationWeek(dayKey(ws)), days })
  }
  return out
}

// ---------- Heures exclues ----------
export interface ExcludedGroup {
  reason: string
  minutes: number
  items: Array<{ date: Date; label: string; minutes: number }>
}

export function excludedStats(items: Analyzed[]): ExcludedGroup[] {
  const map = new Map<string, ExcludedGroup>()
  for (const it of items) {
    const reason = it.info.reason
    if (!reason) continue
    let g = map.get(reason)
    if (!g) {
      g = { reason, minutes: 0, items: [] }
      map.set(reason, g)
    }
    const m = minutesOf(it)
    g.minutes += m
    g.items.push({
      date: it.course.start,
      label: [it.course.title, it.course.subtitle].filter(Boolean).join(' '),
      minutes: m,
    })
  }
  const out = [...map.values()]
  for (const g of out) g.items.sort((a, b) => a.date.getTime() - b.date.getTime())
  return out.sort((a, b) => b.minutes - a.minutes)
}

// ---------- Jours spéciaux ----------
export interface SpecialDay {
  type: 'vacances' | 'ferie' | 'manuelle'
  from: Date
  to: Date
  label: string
}

export function specialDays(planner: Planner, settings: RevSettings): SpecialDay[] {
  const out: SpecialDay[] = []
  for (const p of settings.periods) {
    out.push({
      type: 'manuelle',
      from: parseKey(p.from),
      to: parseKey(p.to),
      label: p.label || 'Vacances (saisies)',
    })
  }

  const first = planner.firstKey
  const last = planner.lastKey
  if (first && last) {
    const end = parseKey(last)
    let run: { from: Date; to: Date } | null = null
    for (let ws = startOfWeek(parseKey(first)); ws.getTime() <= end.getTime(); ws = addDays(ws, 7)) {
      if (planner.isVacationWeek(dayKey(ws))) {
        run = run ? { from: run.from, to: addDays(ws, 6) } : { from: ws, to: addDays(ws, 6) }
      } else if (run) {
        out.push({ type: 'vacances', from: run.from, to: run.to, label: 'Semaine(s) sans cours' })
        run = null
      }
    }
    if (run) out.push({ type: 'vacances', from: run.from, to: run.to, label: 'Semaine(s) sans cours' })

    for (let d = parseKey(first); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
      const h = holidayName(d)
      if (h) out.push({ type: 'ferie', from: d, to: d, label: h })
    }
  }
  return out.sort((a, b) => a.from.getTime() - b.from.getTime())
}
