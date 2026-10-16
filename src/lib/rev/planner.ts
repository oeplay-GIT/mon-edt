import type { Analyzed, Nature } from './analyze'
import {
  addDays,
  ceil10,
  clamp,
  dayKey,
  diffDays,
  floor10,
  isoWeekday,
  minutesOfDay,
  parseKey,
  startOfDay,
  startOfWeek,
} from './clock'
import { holidayName } from './holidays'
import type { RevSettings } from './settings'
import { subjectFactor, type Subject } from './subjects'

const DAY_START = 540 // 9 h
const DAY_END = 1320 // 22 h
const TRAVEL = 60 // trajet après le dernier cours
const PAUSE = 10
const PAUSE_RESERVE = 30
const WEEKEND_DAY_MAX = 360
const WEEKEND_SHARE = 0.4
const REV_PER_COURSE_HOUR = 0.5
const CHUNK = 30
const EVAL_WINDOW = 14

export interface EvalItem {
  id: string
  dateKey: string
  start: Date
  end: Date
  minutes: number
  subjectKey: string
  name: string
  nature: Nature
  /** Minutes de révision visées (2 h à 3 h) */
  budget: number
}

export interface Block {
  subjectKey: string
  name: string
  start: number
  end: number
  minutes: number
  evalId: string | null
}

export interface DayPlan {
  key: string
  date: Date
  weekend: boolean
  closedReason: string | null
  courseMinutes: number
  window: [number, number] | null
  blocks: Block[]
  total: number
}

export interface WeekPlan {
  start: Date
  days: DayPlan[]
  courseMinutes: number
  revisionMinutes: number
  vacation: boolean
}

export interface Planner {
  evals: EvalItem[]
  weekPlan: (ws: Date) => WeekPlan
  closedReason: (d: Date) => string | null
  freeWindow: (d: Date) => [number, number] | null
  isVacationWeek: (weekKey: string) => boolean
  firstKey: string | null
  lastKey: string | null
}

interface DayCap {
  key: string
  date: Date
  weekend: boolean
  closedReason: string | null
  segments: Array<[number, number]>
  window: [number, number] | null
  cap: number
  target: number
}

interface Item {
  subjectKey: string
  name: string
  minutes: number
  evalId: string | null
}

interface Cand {
  key: string
  k: number
  target: number
  coef: number
  share: number
}

function placeBlocks(segments: Array<[number, number]>, items: Item[]): Block[] {
  const out: Block[] = []
  let si = 0
  const first = segments[0]
  let cursor = first ? first[0] : 0
  for (const it of items) {
    let remaining = it.minutes
    while (remaining > 0) {
      const seg = segments[si]
      if (!seg) break
      if (cursor < seg[0]) cursor = seg[0]
      const room = floor10(seg[1] - cursor)
      if (room < 10) {
        si += 1
        continue
      }
      const take = Math.min(remaining, room)
      out.push({
        subjectKey: it.subjectKey,
        name: it.name,
        start: cursor,
        end: cursor + take,
        minutes: take,
        evalId: it.evalId,
      })
      cursor += take + PAUSE
      remaining -= take
    }
  }
  return out
}

export function createPlanner(
  items: Analyzed[],
  subjects: Map<string, Subject>,
  settings: RevSettings,
  today: Date,
): Planner {
  // ---------- Calendrier ----------
  const byDay = new Map<string, Analyzed[]>()
  const weekHasCourse = new Set<string>()
  const weekCourseMin = new Map<string, number>()
  const weekSubjectMin = new Map<string, Map<string, number>>()
  const totalSubjectMin = new Map<string, number>()
  let firstKey: string | null = null
  let lastKey: string | null = null

  for (const it of items) {
    const k = dayKey(it.course.start)
    const list = byDay.get(k)
    if (list) list.push(it)
    else byDay.set(k, [it])
    if (firstKey === null || k < firstKey) firstKey = k
    if (lastKey === null || k > lastKey) lastKey = k
    const wk = dayKey(startOfWeek(it.course.start))
    if (isoWeekday(it.course.start) < 5) weekHasCourse.add(wk)
    if (it.info.counted && it.info.key) {
      const mins = Math.max(0, (it.course.end.getTime() - it.course.start.getTime()) / 60000)
      weekCourseMin.set(wk, (weekCourseMin.get(wk) ?? 0) + mins)
      let m = weekSubjectMin.get(wk)
      if (!m) {
        m = new Map<string, number>()
        weekSubjectMin.set(wk, m)
      }
      m.set(it.info.key, (m.get(it.info.key) ?? 0) + mins)
      totalSubjectMin.set(it.info.key, (totalSubjectMin.get(it.info.key) ?? 0) + mins)
    }
  }

  /** Semaine entière sans cours, située entre le premier et le dernier cours */
  function isVacationWeek(wk: string): boolean {
    if (firstKey === null || lastKey === null) return false
    return !weekHasCourse.has(wk) && wk > firstKey && wk < lastKey
  }

  /** Raison de fermeture d'un jour de semaine (vacances, férié), sinon null */
  function closedReason(d: Date): string | null {
    if (isoWeekday(d) >= 5) return null
    const k = dayKey(d)
    for (const p of settings.periods) {
      if (k >= p.from && k <= p.to) return p.label || 'Vacances'
    }
    const h = holidayName(d)
    if (h) return h
    if (isVacationWeek(dayKey(startOfWeek(d)))) return 'Vacances'
    return null
  }

  // ---------- Capacités par jour ----------
  const capCache = new Map<string, DayCap[]>()

  function weekCaps(ws: Date): DayCap[] {
    const wk = dayKey(ws)
    const hit = capCache.get(wk)
    if (hit) return hit

    const days: DayCap[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(ws, i)
      const key = dayKey(date)
      const weekend = i >= 5
      const reason = closedReason(date)
      const evs = byDay.get(key) ?? []
      let segments: Array<[number, number]> = []
      let win: [number, number] | null = null
      let cap = 0

      if (!weekend) {
        if (reason === null) {
          const lastEnd = evs.reduce((m, e) => Math.max(m, minutesOfDay(e.course.end)), -1)
          const start = lastEnd < 0 ? DAY_START : Math.max(DAY_START, ceil10(lastEnd + TRAVEL))
          cap = floor10(Math.min(settings.weekdayMax, DAY_END - start - PAUSE_RESERVE))
          if (cap >= settings.weekdayMin) {
            segments = [[start, DAY_END]]
            win = [start, DAY_END]
          } else {
            cap = 0
          }
        }
      } else {
        const busy = evs
          .map((e): [number, number] => [
            clamp(minutesOfDay(e.course.start), DAY_START, DAY_END),
            clamp(minutesOfDay(e.course.end), DAY_START, DAY_END),
          ])
          .sort((a, b) => a[0] - b[0])
        let cursor = DAY_START
        for (const [s, e] of busy) {
          if (s > cursor) segments.push([cursor, s])
          cursor = Math.max(cursor, e)
        }
        if (cursor < DAY_END) segments.push([cursor, DAY_END])
        segments = segments.filter(([s, e]) => e - s >= 30)
        const free = segments.reduce((t, [s, e]) => t + (e - s), 0)
        cap = floor10(Math.min(WEEKEND_DAY_MAX, free - PAUSE_RESERVE))
        const f = segments[0]
        const l = segments[segments.length - 1]
        if (cap >= 30 && f && l) win = [f[0], l[1]]
        else cap = 0
      }

      days.push({ key, date, weekend, closedReason: reason, segments, window: win, cap, target: 0 })
    }

    // Objectifs du jour : 0,5 h de révision par heure de cours, bornée
    const W = (weekCourseMin.get(wk) ?? 0) * REV_PER_COURSE_HOUR
    const wkd = days.filter((d) => d.weekend && d.cap > 0)
    const wkCap = wkd.reduce((t, d) => t + d.cap, 0)
    let weekendTarget = 0
    if (wkCap > 0) {
      weekendTarget = Math.min(
        wkCap,
        clamp(W * WEEKEND_SHARE, settings.weekendMin, settings.weekendMax),
      )
    }
    for (const d of wkd) d.target = Math.min(d.cap, ceil10((weekendTarget * d.cap) / wkCap))

    const open = days.filter((d) => !d.weekend && d.cap > 0)
    const lenOf = (d: DayCap) => (d.window ? d.window[1] - d.window[0] : 0)
    const lenTotal = open.reduce((t, d) => t + lenOf(d), 0)
    const pool = Math.max(0, W - weekendTarget)
    for (const d of open) {
      const share = lenTotal > 0 ? (pool * lenOf(d)) / lenTotal : 0
      d.target = clamp(ceil10(share), settings.weekdayMin, d.cap)
    }

    capCache.set(wk, days)
    return days
  }

  function capOfDay(d: Date): DayCap | undefined {
    return weekCaps(startOfWeek(d))[isoWeekday(d)]
  }

  // ---------- Évaluations ----------
  const evalMap = new Map<string, EvalItem>()
  for (const it of items) {
    if (!it.info.isExam) continue
    const subjectKey = it.info.key ?? (it.info.name || 'autre')
    const dk = dayKey(it.course.start)
    const id = `${dk}|${subjectKey}|${it.info.nature}`
    const prev = evalMap.get(id)
    if (prev) {
      if (it.course.start.getTime() < prev.start.getTime()) prev.start = it.course.start
      if (it.course.end.getTime() > prev.end.getTime()) prev.end = it.course.end
      continue
    }
    const subj = it.info.key ? subjects.get(it.info.key) : undefined
    const f = subj ? subjectFactor(subj) : 1
    const t = clamp((f - 0.56) / (2.24 - 0.56), 0, 1)
    const maxBudget = Math.max(120, Math.floor(settings.evalMax / 30) * 30)
    const budget = clamp(Math.round((120 + t * 60) / 30) * 30, 120, maxBudget)
    evalMap.set(id, {
      id,
      dateKey: dk,
      start: it.course.start,
      end: it.course.end,
      minutes: 0,
      subjectKey,
      name: subj?.name ?? (it.info.name || subjectKey),
      nature: it.info.nature,
      budget,
    })
  }
  const evals = [...evalMap.values()]
  for (const ev of evals) ev.minutes = Math.round((ev.end.getTime() - ev.start.getTime()) / 60000)
  evals.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.name.localeCompare(b.name))
  const evalById = new Map<string, EvalItem>()
  for (const ev of evals) evalById.set(ev.id, ev)

  function activeEvalCount(d: Date): number {
    let n = 0
    for (const ev of evals) {
      const diff = diffDays(d, parseKey(ev.dateKey))
      if (diff >= 1 && diff <= EVAL_WINDOW) n += 1
    }
    return n
  }

  // jour → (évaluation → minutes de révision)
  const placement = new Map<string, Map<string, number>>()
  const usedByDay = new Map<string, number>()
  const todayStart = startOfDay(today)

  for (const ev of evals) {
    const evDate = parseKey(ev.dateKey)
    if (evDate.getTime() < todayStart.getTime()) continue

    const cands: Cand[] = []
    for (let k = EVAL_WINDOW; k >= 1; k--) {
      const d = addDays(evDate, -k)
      if (d.getTime() < todayStart.getTime()) continue
      const c = capOfDay(d)
      if (!c || c.target < CHUNK) continue
      cands.push({
        key: c.key,
        k,
        target: c.target,
        coef: 1 + (EVAL_WINDOW - k) / (EVAL_WINDOW - 1),
        share: activeEvalCount(d) >= 3 ? Math.max(0.8, settings.evalShare) : settings.evalShare,
      })
    }

    const counts = new Map<string, number>()
    const n = Math.round(ev.budget / CHUNK)
    for (let i = 0; i < n; i++) {
      let pick: Cand | null = null
      let bestScore = -1
      for (const c of cands) {
        const used = usedByDay.get(c.key) ?? 0
        if (used + CHUNK > c.target * c.share + 1e-9) continue
        const score = (c.coef * c.target) / ((counts.get(c.key) ?? 0) + 1)
        if (score >= bestScore) {
          bestScore = score
          pick = c
        }
      }
      if (!pick) break
      counts.set(pick.key, (counts.get(pick.key) ?? 0) + 1)
      usedByDay.set(pick.key, (usedByDay.get(pick.key) ?? 0) + CHUNK)
      let m = placement.get(pick.key)
      if (!m) {
        m = new Map<string, number>()
        placement.set(pick.key, m)
      }
      m.set(ev.id, (m.get(ev.id) ?? 0) + CHUNK)
    }
  }

  // ---------- Plan d'une semaine ----------
  function weekPlan(ws: Date): WeekPlan {
    const wk = dayKey(ws)
    const caps = weekCaps(ws)

    const weekHours = weekSubjectMin.get(wk)
    const source = weekHours && weekHours.size > 0 ? weekHours : totalSubjectMin
    const weights = new Map<string, number>()
    for (const [k, m] of source) {
      const s = subjects.get(k)
      if (s) weights.set(k, m * subjectFactor(s))
    }
    let totalW = 0
    for (const w of weights.values()) totalW += w
    const totalTarget = caps.reduce((t, d) => t + d.target, 0)

    const evalBySubject = new Map<string, number>()
    for (const d of caps) {
      const placed = placement.get(d.key)
      if (!placed) continue
      for (const [id, m] of placed) {
        const ev = evalById.get(id)
        if (ev) evalBySubject.set(ev.subjectKey, (evalBySubject.get(ev.subjectKey) ?? 0) + m)
      }
    }

    const deficit = new Map<string, number>()
    const ordered = [...weights.entries()].sort((a, b) => b[1] - a[1])
    for (const [k, w] of ordered) {
      const goal = totalW > 0 ? (totalTarget * w) / totalW : 0
      deficit.set(k, goal - (evalBySubject.get(k) ?? 0))
    }

    const days: DayPlan[] = []
    let revisionMinutes = 0

    for (const cap of caps) {
      const evs = byDay.get(cap.key) ?? []
      let courseMinutes = 0
      for (const e of evs) {
        if (e.info.counted) {
          courseMinutes += Math.max(0, (e.course.end.getTime() - e.course.start.getTime()) / 60000)
        }
      }

      const list: Item[] = []
      let used = 0
      const placed = placement.get(cap.key)
      if (placed) {
        const entries: Array<{ ev: EvalItem; minutes: number }> = []
        for (const [id, m] of placed) {
          const ev = evalById.get(id)
          if (ev) entries.push({ ev, minutes: m })
        }
        entries.sort((a, b) => a.ev.dateKey.localeCompare(b.ev.dateKey))
        for (const { ev, minutes } of entries) {
          list.push({ subjectKey: ev.subjectKey, name: ev.name, minutes, evalId: ev.id })
          used += minutes
        }
      }

      let rem = Math.max(0, cap.target - used)
      const alloc = new Map<string, number>()
      while (rem > 0 && deficit.size > 0) {
        const size = rem >= 60 ? CHUNK : rem
        let bestKey: string | null = null
        let best = -Infinity
        for (const [k, v] of deficit) {
          if (v > best + 1e-9) {
            best = v
            bestKey = k
          }
        }
        if (bestKey === null) break
        alloc.set(bestKey, (alloc.get(bestKey) ?? 0) + size)
        deficit.set(bestKey, best - size)
        rem -= size
      }
      const regular = [...alloc.entries()].sort((a, b) => b[1] - a[1])
      for (const [k, m] of regular) {
        list.push({ subjectKey: k, name: subjects.get(k)?.name ?? k, minutes: m, evalId: null })
      }

      const blocks = placeBlocks(cap.segments, list)
      const total = blocks.reduce((t, b) => t + b.minutes, 0)
      revisionMinutes += total
      days.push({
        key: cap.key,
        date: cap.date,
        weekend: cap.weekend,
        closedReason: cap.closedReason,
        courseMinutes: Math.round(courseMinutes),
        window: cap.window,
        blocks,
        total,
      })
    }

    return {
      start: ws,
      days,
      courseMinutes: Math.round(weekCourseMin.get(wk) ?? 0),
      revisionMinutes,
      vacation: isVacationWeek(wk),
    }
  }

  return {
    evals,
    weekPlan,
    closedReason,
    freeWindow: (d: Date) => capOfDay(d)?.window ?? null,
    isVacationWeek,
    firstKey,
    lastKey,
  }
}
