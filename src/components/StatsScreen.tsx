import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Analyzed } from '../lib/rev/analyze'
import { DAY_MS, dayKey, fmtClock, fmtDur, parseKey, startOfDay } from '../lib/rev/clock'
import type { Planner } from '../lib/rev/planner'
import type { RevSettings } from '../lib/rev/settings'
import { excludedStats, specialDays, subjectStats, weekStats } from '../lib/rev/stats'
import type { Subject } from '../lib/rev/subjects'
import { subjectColor } from '../lib/rev/ui'

type Props = {
  items: Analyzed[]
  subjects: Map<string, Subject>
  planner: Planner
  settings: RevSettings
  now: Date
  onBack: () => void
}

const fmtDM = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const fmtWD = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })

const SPECIAL_LABELS: Record<string, string> = {
  vacances: 'Vacances',
  ferie: 'Jour férié',
  manuelle: 'Période ajoutée',
}

function asDate(v: Date | string | number): Date {
  if (v instanceof Date) return v
  if (typeof v === 'string') return parseKey(v)
  return new Date(v)
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function num(n: number, digits = 1): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: digits })
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`
}

function range(a: Date, b: Date): string {
  return dayKey(a) === dayKey(b) ? fmtDM.format(a) : `${fmtDM.format(a)} – ${fmtDM.format(b)}`
}

function countdown(days: number): string {
  if (days < 0) return 'Passée'
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} j`
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-ink/40 transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

function Empty({ text = 'Rien à afficher pour le moment.' }: { text?: string }) {
  return <p className="py-1 text-[13px] text-ink/60">{text}</p>
}

function Section({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:opacity-60"
      >
        <span className="flex-1 text-[15px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-ink/60">{summary}</span>
        <Caret open={open} />
      </button>
      {open && <div className="border-t border-line px-4 py-3">{children}</div>}
    </section>
  )
}

export function StatsScreen({ items, subjects, planner, settings, now, onBack }: Props) {
  const [opened, setOpened] = useState<Record<string, boolean>>({ subjects: true })
  const [openWeek, setOpenWeek] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const minute = Math.floor(now.getTime() / 60000)

  const subjectList = useMemo(
    () => subjectStats(items, subjects, new Date(minute * 60000)),
    [items, subjects, minute],
  )
  const weeks = useMemo(() => weekStats(items, planner), [items, planner])
  const excluded = useMemo(() => excludedStats(items), [items])
  const specials = useMemo(() => specialDays(planner, settings), [planner, settings])
  const evals = useMemo(
    () =>
      [...planner.evals].sort((a, b) =>
        a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0,
      ),
    [planner],
  )
  const totals = useMemo(
    () =>
      subjectList.reduce(
        (acc, s) => ({
          total: acc.total + s.totalMin,
          done: acc.done + s.doneMin,
          left: acc.left + s.leftMin,
        }),
        { total: 0, done: 0, left: 0 },
      ),
    [subjectList],
  )

  const excludedMin = excluded.reduce((sum, g) => sum + g.minutes, 0)
  const today0 = startOfDay(now).getTime()
  const nowMs = now.getTime()
  const toggle = (k: string) => setOpened((o) => ({ ...o, [k]: !o[k] }))

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col overflow-x-clip">
      <header className="sticky top-0 z-10 bg-canvas pt-[env(safe-area-inset-top)]">
        <div className="px-5 pt-3">
          <button
            type="button"
            onClick={onBack}
            className="-ml-1.5 flex items-center gap-0.5 rounded-full py-1 pr-2 text-[16px] font-medium text-accent active:opacity-60"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path d="M10 3.5 5.5 8 10 12.5" />
            </svg>
            Retour
          </button>
        </div>
        <h1 className="px-5 pb-3 pt-1 text-[32px] font-bold leading-tight tracking-tight text-ink">
          Statistiques
        </h1>
        <div className="h-px bg-line" />
      </header>

      <main className="min-w-0 flex-1 space-y-3 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-line">
          {[
            { label: 'Heures de cours', min: totals.total },
            { label: 'Déjà faites', min: totals.done },
            { label: 'Restantes', min: totals.left },
          ].map((c) => (
            <div key={c.label} className="bg-surface px-3 py-3.5 text-center">
              <p className="text-[18px] font-semibold tabular-nums text-ink">{fmtDur(c.min)}</p>
              <p className="mt-0.5 text-[12px] text-ink/60">{c.label}</p>
            </div>
          ))}
        </div>

        <Section
          title="Par matière"
          summary={plural(subjectList.length, 'matière', 'matières')}
          open={!!opened.subjects}
          onToggle={() => toggle('subjects')}
        >
          {subjectList.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-line">
              {subjectList.map((s) => {
                const pct =
                  s.totalMin > 0 ? Math.min(100, Math.round((s.doneMin / s.totalMin) * 100)) : 0
                return (
                  <li key={s.key} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: subjectColor(s.key) }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                        {s.name}
                      </span>
                      <span className="text-[13px] tabular-nums text-ink/60">
                        {fmtDur(s.totalMin)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-[12px] text-ink/60">
                      Fait {fmtDur(s.doneMin)} · Reste {fmtDur(s.leftMin)}
                    </p>
                    {s.sessions.length > 0 && (
                      <p className="mt-0.5 text-[12px] text-ink/60">
                        {s.sessions.map((x) => `${x.kind} ${x.done}/${x.total}`).join(' · ')}
                      </p>
                    )}
                    {s.teachers.length > 0 && (
                      <p className="mt-0.5 text-[12px] text-ink/60">{s.teachers.join(', ')}</p>
                    )}
                    <p className="mt-0.5 text-[12px] text-ink/60">
                      {s.average != null
                        ? `Moyenne ${num(s.average, 2)}/20 (${plural(s.gradeCount, 'note', 'notes')})`
                        : 'Pas de note'}
                      {' · '}Difficulté {num(s.difficulty)}/5
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section
          title="Par semaine"
          summary={plural(weeks.length, 'semaine', 'semaines')}
          open={!!opened.weeks}
          onToggle={() => toggle('weeks')}
        >
          {weeks.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-line">
              {weeks.map((w) => {
                const start = asDate(w.start)
                const wk = dayKey(start)
                const isOpen = openWeek === wk
                const current = nowMs >= start.getTime() && nowMs < start.getTime() + 7 * DAY_MS
                return (
                  <li key={wk}>
                    <button
                      type="button"
                      onClick={() => setOpenWeek(isOpen ? null : wk)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-2 py-2.5 text-left active:opacity-60"
                    >
                      <span className="min-w-0 flex-1 text-[14px] text-ink">
                        Semaine du {fmtDM.format(start)}
                        {current && (
                          <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                            Cette semaine
                          </span>
                        )}
                      </span>
                      <span className="text-[13px] tabular-nums text-ink/60">
                        {w.vacation
                          ? 'Vacances'
                          : w.courseMin > 0
                            ? fmtDur(w.courseMin)
                            : 'Aucun cours'}
                      </span>
                      <Caret open={isOpen} />
                    </button>
                    {isOpen && (
                      <ul className="mb-2 divide-y divide-line rounded-xl bg-canvas px-3 py-1">
                        {w.days.map((d) => (
                          <li key={d.key} className="py-2 text-[13px]">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-ink">{cap(fmtWD.format(asDate(d.date)))}</span>
                              <span className="text-right tabular-nums text-ink/60">
                                {d.closed
                                  ? d.closed
                                  : d.courseMin > 0
                                    ? fmtDur(d.courseMin)
                                    : 'Aucun cours'}
                              </span>
                            </div>
                            {!d.closed && d.free && (
                              <p className="mt-0.5 text-[12px] text-ink/50">
                                Créneau libre {fmtClock(d.free[0])} – {fmtClock(d.free[1])}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section
          title="Heures exclues"
          summary={fmtDur(excludedMin)}
          open={!!opened.excluded}
          onToggle={() => toggle('excluded')}
        >
          {excluded.length === 0 ? (
            <Empty text="Aucune séance exclue." />
          ) : (
            <>
              <p className="pb-2 text-[12px] text-ink/60">
                Séances non comptées dans les heures de cours.
              </p>
              <div className="divide-y divide-line">
                {excluded.map((g) => (
                  <div key={g.reason} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[14px] font-medium text-ink">{g.reason}</p>
                      <p className="text-[13px] tabular-nums text-ink/60">{fmtDur(g.minutes)}</p>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {g.items.slice(0, 6).map((it, i) => (
                        <li
                          key={`${i}-${it.label}`}
                          className="flex justify-between gap-3 text-[12px] text-ink/60"
                        >
                          <span className="min-w-0 truncate">
                            {fmtDM.format(asDate(it.date))} · {it.label}
                          </span>
                          <span className="shrink-0 tabular-nums">{fmtDur(it.minutes)}</span>
                        </li>
                      ))}
                    </ul>
                    {g.items.length > 6 && (
                      <p className="mt-1 text-[12px] text-ink/40">
                        … et {g.items.length - 6} autre{g.items.length - 6 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        <Section
          title="Évaluations"
          summary={plural(evals.length, 'évaluation', 'évaluations')}
          open={!!opened.evals}
          onToggle={() => toggle('evals')}
        >
          {evals.length === 0 ? (
            <Empty text="Aucune évaluation repérée." />
          ) : (
            <ul className="divide-y divide-line">
              {evals.map((e) => {
                const date = parseKey(e.dateKey)
                const days = Math.round((date.getTime() - today0) / DAY_MS)
                return (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{e.name}</p>
                      <p className="mt-0.5 text-[12px] text-ink/60">
                        {cap(fmtWD.format(date))} · {fmtDur(e.minutes)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        days < 0
                          ? 'bg-line text-ink/60'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {countdown(days)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section
          title="Jours spéciaux"
          summary={plural(specials.length, 'période', 'périodes')}
          open={!!opened.specials}
          onToggle={() => toggle('specials')}
        >
          {specials.length === 0 ? (
            <Empty text="Aucune période de vacances ou jour férié." />
          ) : (
            <ul className="divide-y divide-line">
              {specials.map((s, i) => {
                const from = asDate(s.from)
                const to = asDate(s.to)
                return (
                  <li
                    key={`${s.type}-${dayKey(from)}-${i}`}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{s.label}</p>
                      <p className="mt-0.5 text-[12px] text-ink/60">{range(from, to)}</p>
                    </div>
                    <span className="shrink-0 text-[12px] text-ink/60">
                      {SPECIAL_LABELS[s.type] ?? s.type}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      </main>
    </div>
  )
}

export default StatsScreen
