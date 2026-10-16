import { useMemo, useState } from 'react'
import type { Analyzed } from '../lib/rev/analyze'
import { dayKey, fmtClock, fmtDur, minutesOfDay, parseKey, startOfWeek } from '../lib/rev/clock'
import type { DayPlan, Planner } from '../lib/rev/planner'
import type { SubjectPref } from '../lib/rev/settings'
import { subjectStats } from '../lib/rev/stats'
import type { Subject } from '../lib/rev/subjects'
import {
  daysUntil,
  fmtCountdown,
  fmtDayMonth,
  fmtGrade,
  fmtMonth,
  fmtWeekdayDay,
  subjectColor,
} from '../lib/rev/ui'
import { ArrowRightIcon, ChevronIcon } from './RevIcons'
import { SubjectSheet } from './SubjectSheet'

type Props = {
  planner: Planner
  subjects: Map<string, Subject>
  items: Analyzed[]
  now: Date
  onSubjectChange: (key: string, pref: SubjectPref | null) => void
  onOpenStats: () => void
}

const SECTION_TITLE = 'px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-soft'
const RED = 'text-red-600 dark:text-red-400'

function clampWeek(planner: Planner, week: Date): Date {
  if (planner.firstKey !== null) {
    const min = startOfWeek(parseKey(planner.firstKey))
    if (week.getTime() < min.getTime()) return min
  }
  if (planner.lastKey !== null) {
    const max = startOfWeek(parseKey(planner.lastKey))
    if (week.getTime() > max.getTime()) return max
  }
  return week
}

function weekBounds(planner: Planner): { min: Date | null; max: Date | null } {
  return {
    min: planner.firstKey !== null ? startOfWeek(parseKey(planner.firstKey)) : null,
    max: planner.lastKey !== null ? startOfWeek(parseKey(planner.lastKey)) : null,
  }
}

function natureLabel(nature: string): string {
  if (nature === 'Th') return 'Théorie'
  if (nature === 'TP') return 'TP'
  if (nature === 'TD') return 'TD'
  return ''
}

function Dots({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Difficulté ${level} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-1.5 w-1.5 rounded-full ${n <= level ? 'bg-ink-soft' : 'bg-line'}`}
        />
      ))}
    </span>
  )
}

type DayCardProps = {
  day: DayPlan
  isToday: boolean
  isPast: boolean
  onOpen: (subjectKey: string) => void
}

function DayCard({ day, isToday, isPast, onOpen }: DayCardProps) {
  const closed = day.closedReason !== null
  const hasBlocks = day.blocks.length > 0

  return (
    <li
      className={`rounded-2xl bg-surface px-4 py-3.5 ${
        closed || (isPast && !hasBlocks) ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
            {fmtWeekdayDay(day.date)}
            {isToday && (
              <span className="rounded-full bg-line px-2 py-0.5 text-[11px] font-medium text-accent">
                Aujourd’hui
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {day.courseMinutes > 0 ? `${fmtDur(day.courseMinutes)} de cours` : 'Pas de cours'}
          </p>
        </div>
        {hasBlocks && (
          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-accent">
            {fmtDur(day.total)}
          </span>
        )}
      </div>

      {closed ? (
        <p className="mt-3 text-[14px] text-ink-soft">
          Pas de révisions{day.closedReason ? ` · ${day.closedReason}` : ''}
        </p>
      ) : hasBlocks ? (
        <ul className="mt-2 space-y-0.5">
          {day.blocks.map((block, index) => (
            <li key={`${block.subjectKey}-${block.start}-${index}`}>
              <button
                type="button"
                onClick={() => onOpen(block.subjectKey)}
                className="flex w-full items-center gap-3 rounded-xl py-1.5 text-left"
              >
                <span
                  className="h-9 w-1 shrink-0 rounded-full"
                  style={{ background: subjectColor(block.subjectKey) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {block.name}
                  </span>
                  <span className="block text-[13px] tabular-nums text-ink-soft">
                    {fmtClock(block.start)} – {fmtClock(block.end)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[14px] tabular-nums text-ink">{fmtDur(block.minutes)}</span>
                  {block.evalId !== null && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                      Éval
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : isPast ? null : (
        <p className="mt-3 text-[14px] text-ink-soft">
          {day.window === null ? 'Pas de créneau libre' : 'Rien à réviser'}
        </p>
      )}
    </li>
  )
}

export function RevisionsView({
  planner,
  subjects,
  items,
  now,
  onSubjectChange,
  onOpenStats,
}: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => clampWeek(planner, startOfWeek(now)))
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [showAllEvals, setShowAllEvals] = useState(false)

  const bounds = useMemo(() => weekBounds(planner), [planner])
  const week = useMemo(() => planner.weekPlan(weekStart), [planner, weekStart])
  const todayKey = dayKey(now)

  const currentWeek = clampWeek(planner, startOfWeek(now))
  const isCurrentWeek = weekStart.getTime() === currentWeek.getTime()
  const canPrev = bounds.min !== null && weekStart.getTime() > bounds.min.getTime()
  const canNext = bounds.max !== null && weekStart.getTime() < bounds.max.getTime()

  function shiftWeek(count: number) {
    setWeekStart(
      new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7 * count),
    )
  }

  const upcoming = useMemo(
    () =>
      planner.evals
        .filter((e) => e.end.getTime() >= now.getTime())
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [planner, now],
  )
  const visibleEvals = showAllEvals ? upcoming : upcoming.slice(0, 5)

  const subjectList = useMemo(() => {
    const counted = new Set<string>()
    for (const item of items) {
      if (item.info.counted && item.info.key !== null) counted.add(item.info.key)
    }
    return Array.from(subjects.values())
      .filter((s) => counted.has(s.key))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [items, subjects])

  const openSubject = openKey !== null ? (subjects.get(openKey) ?? null) : null
  const openStat = useMemo(() => {
    if (openKey === null) return null
    return subjectStats(items, subjects, now).find((s) => s.key === openKey) ?? null
  }, [openKey, items, subjects, now])

  return (
    <section className="px-5 pb-28">
      {/* Sélecteur de semaine */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          disabled={!canPrev}
          aria-label="Semaine précédente"
          className="grid h-10 w-10 place-items-center rounded-full text-ink-soft disabled:opacity-30"
        >
          <ChevronIcon dir="left" />
        </button>
        <div className="text-center">
          <h2 className="text-[17px] font-semibold text-ink">
            Semaine du {fmtDayMonth(weekStart)}
          </h2>
          {!isCurrentWeek ? (
            <button
              type="button"
              onClick={() => setWeekStart(currentWeek)}
              className="text-[13px] font-medium text-accent"
            >
              Revenir à cette semaine
            </button>
          ) : week.vacation ? (
            <p className="text-[13px] text-ink-soft">Semaine de vacances</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          disabled={!canNext}
          aria-label="Semaine suivante"
          className="grid h-10 w-10 place-items-center rounded-full text-ink-soft disabled:opacity-30"
        >
          <ChevronIcon dir="right" />
        </button>
      </div>

      {/* Résumé de la semaine */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5">
        <div className="flex-1">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">Cours</p>
          <p className="text-[22px] leading-tight font-semibold tabular-nums text-ink">
            {fmtDur(week.courseMinutes)}
          </p>
        </div>
        <ArrowRightIcon className="h-5 w-5 shrink-0 text-ink-soft" />
        <div className="flex-1 text-right">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
            Révisions
          </p>
          <p className="text-[22px] leading-tight font-semibold tabular-nums text-accent">
            {fmtDur(week.revisionMinutes)}
          </p>
        </div>
      </div>

      {/* Jours */}
      <ul className="mt-4 space-y-2.5">
        {week.days.map((day) => (
          <DayCard
            key={day.key}
            day={day}
            isToday={day.key === todayKey}
            isPast={day.key < todayKey}
            onOpen={setOpenKey}
          />
        ))}
      </ul>

      {/* Évaluations à venir */}
      <h2 className={`mt-8 mb-2 ${SECTION_TITLE}`}>Évaluations à venir</h2>
      {upcoming.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-3.5 text-[14px] text-ink-soft">
          Aucune évaluation à venir.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface">
          <ul>
            {visibleEvals.map((e, index) => {
              const days = daysUntil(now, e.start)
              const urgent = days < 14
              const details = [
                `${fmtClock(minutesOfDay(e.start))} – ${fmtClock(minutesOfDay(e.end))}`,
                natureLabel(e.nature),
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={e.id}>
                  {index > 0 && <div className="mx-4 h-px bg-line" />}
                  <button
                    type="button"
                    onClick={() => setOpenKey(e.subjectKey)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-line py-1">
                      <span className="text-[17px] leading-tight font-semibold text-ink">
                        {e.start.getDate()}
                      </span>
                      <span className="text-[11px] leading-tight uppercase text-ink-soft">
                        {fmtMonth(e.start)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">
                        {e.name}
                      </span>
                      <span className="block truncate text-[13px] tabular-nums text-ink-soft">
                        {details}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[13px] font-medium ${urgent ? RED : 'text-ink-soft'}`}
                    >
                      {fmtCountdown(days)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {upcoming.length > 5 && (
            <>
              <div className="mx-4 h-px bg-line" />
              <button
                type="button"
                onClick={() => setShowAllEvals(!showAllEvals)}
                className="w-full px-4 py-3 text-center text-[14px] font-medium text-accent"
              >
                {showAllEvals ? 'Voir moins' : `Tout afficher (${upcoming.length})`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Matières */}
      <h2 className={`mt-8 mb-2 ${SECTION_TITLE}`}>Matières</h2>
      {subjectList.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-3.5 text-[14px] text-ink-soft">
          Aucune matière détectée.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface">
          <ul>
            {subjectList.map((s, index) => (
              <li key={s.key}>
                {index > 0 && <div className="mx-4 h-px bg-line" />}
                <button
                  type="button"
                  onClick={() => setOpenKey(s.key)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: subjectColor(s.key) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">
                      {s.name}
                    </span>
                    <span className="block text-[13px] tabular-nums text-ink-soft">
                      {s.average !== null ? `Moyenne ${fmtGrade(s.average)}` : 'Pas de note'}
                    </span>
                  </span>
                  <Dots level={s.difficulty} />
                  <ChevronIcon className="h-4 w-4 shrink-0 text-ink-soft" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Statistiques */}
      <button
        type="button"
        onClick={onOpenStats}
        className="mt-6 flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-left"
      >
        <span className="text-[15px] font-medium text-ink">Statistiques</span>
        <ChevronIcon className="h-4 w-4 text-ink-soft" />
      </button>

      {openSubject !== null && (
        <SubjectSheet
          key={openSubject.key}
          subject={openSubject}
          stat={openStat}
          onSave={(pref) => onSubjectChange(openSubject.key, pref)}
          onClose={() => setOpenKey(null)}
        />
      )}
    </section>
  )
}
