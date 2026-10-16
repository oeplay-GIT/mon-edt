import { useEffect, useState } from 'react'
import { fmtDur } from '../lib/rev/clock'
import type { SubjectPref } from '../lib/rev/settings'
import type { SubjectStat } from '../lib/rev/stats'
import { parseGrades } from '../lib/rev/subjects'
import type { Subject } from '../lib/rev/subjects'
import { fmtGrade, subjectColor } from '../lib/rev/ui'
import { CloseIcon } from './RevIcons'

type Props = {
  subject: Subject
  stat: SubjectStat | null
  onSave: (pref: SubjectPref | null) => void
  onClose: () => void
}

const LEVELS = [1, 2, 3, 4, 5]
const LEVEL_LABELS = ['Très facile', 'Facile', 'Moyenne', 'Difficile', 'Très difficile']
const LABEL = 'text-[13px] font-semibold uppercase tracking-wide text-ink-soft'

export function SubjectSheet({ subject, stat, onSave, onClose }: Props) {
  const [notes, setNotes] = useState<string>(subject.notes)
  const [difficulty, setDifficulty] = useState<number>(subject.difficulty)
  const [shown, setShown] = useState(false)
  const color = subjectColor(subject.key)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const grades = parseGrades(notes)
  const average = grades.count > 0 && grades.average !== null ? grades.average : null
  const customized =
    subject.notes.trim() !== subject.defaultNotes.trim() ||
    subject.difficulty !== subject.defaultDifficulty
  const progress =
    stat !== null && stat.totalMin > 0
      ? Math.min(100, Math.round((stat.doneMin / stat.totalMin) * 100))
      : 0

  function save() {
    const sameAsDefault =
      notes.trim() === subject.defaultNotes.trim() && difficulty === subject.defaultDifficulty
    onSave(
      sameAsDefault
        ? null
        : {
            notes: notes.trim(),
            difficulty: difficulty === subject.defaultDifficulty ? null : difficulty,
          },
    )
    onClose()
  }

  function reset() {
    onSave(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={subject.name}
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-canvas px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-200 ease-out ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />

        <div className="flex items-start gap-3">
          <span
            className="mt-2 h-3 w-3 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <h2 className="min-w-0 flex-1 text-[20px] leading-tight font-semibold text-ink">
            {subject.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-line text-ink-soft"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {stat !== null && stat.totalMin > 0 && (
            <section className="rounded-2xl bg-surface p-4">
              <h3 className={LABEL}>Heures de cours</h3>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, background: color }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[14px] tabular-nums">
                <span className="text-ink">{fmtDur(stat.doneMin)} faites</span>
                <span className="text-ink-soft">{fmtDur(stat.leftMin)} restantes</span>
              </div>
              {stat.teachers.length > 0 && (
                <p className="mt-2 text-[13px] text-ink-soft">{stat.teachers.join(', ')}</p>
              )}
            </section>
          )}

          <section className="rounded-2xl bg-surface p-4">
            <h3 className={LABEL}>Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex. : 12 ; 15,5 ; 9x2"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-3 w-full resize-none rounded-xl bg-canvas px-3 py-2.5 text-[16px] text-ink ring-1 ring-line outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-accent"
            />
            <p className="mt-2 text-[13px] text-ink-soft">
              Sépare les notes par un point-virgule. Ajoute x2 pour un coefficient (ex. 12x2).
            </p>
            <p className="mt-3 text-[15px] text-ink">
              {average !== null
                ? `Moyenne : ${fmtGrade(average)} / 20 · ${grades.count} note${
                    grades.count > 1 ? 's' : ''
                  }`
                : 'Aucune note saisie'}
            </p>
          </section>

          <section className="rounded-2xl bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <h3 className={LABEL}>Difficulté</h3>
              <span className="text-[13px] text-ink-soft">
                {LEVEL_LABELS[Math.round(difficulty) - 1] ?? ''}
              </span>
            </div>
            <div
              className="mt-3 grid grid-cols-5 gap-2"
              role="group"
              aria-label="Difficulté de 1 à 5"
            >
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  aria-pressed={level === difficulty}
                  className={`rounded-xl py-2 text-[15px] font-semibold transition-colors ${
                    level === difficulty ? 'bg-ink text-canvas' : 'bg-line text-ink-soft'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-ink-soft">
              Une matière difficile reçoit plus de temps de révision.
            </p>
          </section>
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-4 w-full rounded-2xl bg-ink py-3.5 text-[16px] font-semibold text-canvas"
        >
          Enregistrer
        </button>
        {customized && (
          <button
            type="button"
            onClick={reset}
            className="mt-2 w-full py-2.5 text-[14px] font-medium text-ink-soft"
          >
            Rétablir les valeurs par défaut
          </button>
        )}
      </div>
    </div>
  )
}
