import { useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_EVAL_WORDS, DEFAULT_SETTINGS, sanitizeSettings } from '../lib/rev/settings'
import type { HolidayPeriod } from '../lib/rev/settings'
import { useRevSettings } from '../lib/rev/useRevSettings'

type NumKey = 'weekdayMin' | 'weekdayMax' | 'weekendMin' | 'weekendMax' | 'evalMax' | 'evalShare'

const btn =
  'rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink transition active:opacity-60 disabled:opacity-40'
const round =
  'flex h-10 w-10 items-center justify-center rounded-full border border-line text-[18px] leading-none text-ink transition active:opacity-60 disabled:opacity-30'
const field =
  'w-full min-w-0 rounded-xl border border-line bg-transparent px-3 py-2 text-[16px] text-ink outline-none focus:border-ink-soft'

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

function formatShare(value: number): string {
  return `${Math.round(value * 100)}\u00a0%`
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-[14px] font-medium text-ink">{title}</h3>
      {hint && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  canMinus,
  canPlus,
}: {
  label: string
  value: string
  onMinus: () => void
  onPlus: () => void
  canMinus: boolean
  canPlus: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[14px] text-ink">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMinus}
          disabled={!canMinus}
          aria-label={`${label} : diminuer`}
          className={round}
        >
          −
        </button>
        <span className="w-[4.5rem] text-center text-[14px] font-medium tabular-nums text-ink">
          {value}
        </span>
        <button
          type="button"
          onClick={onPlus}
          disabled={!canPlus}
          aria-label={`${label} : augmenter`}
          className={round}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function RevSettingsPanel() {
  const { settings, update } = useRevSettings()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [label, setLabel] = useState('')

  const wordsText = settings.evalWords.join(', ')
  const wordsAreDefault = wordsText === DEFAULT_EVAL_WORDS.join(', ')
  const canAdd = from !== '' && to !== '' && from <= to

  function nextValue(key: NumKey, delta: number): number {
    return Math.round((settings[key] + delta) * 100) / 100
  }

  function canMove(key: NumKey, delta: number): boolean {
    const next = sanitizeSettings({ ...settings, [key]: nextValue(key, delta) })
    return next[key] !== settings[key]
  }

  function move(key: NumKey, delta: number) {
    update(sanitizeSettings({ ...settings, [key]: nextValue(key, delta) }))
  }

  function row(key: NumKey, text: string, step: number, format: (value: number) => string) {
    return (
      <Stepper
        label={text}
        value={format(settings[key])}
        onMinus={() => move(key, -step)}
        onPlus={() => move(key, step)}
        canMinus={canMove(key, -step)}
        canPlus={canMove(key, step)}
      />
    )
  }

  function commitWords(text: string) {
    const words = Array.from(
      new Set(
        text
          .split(/[,;\n]+/)
          .map((w) => w.trim())
          .filter((w) => w !== ''),
      ),
    )
    update({ evalWords: words.length > 0 ? words : [...DEFAULT_EVAL_WORDS] })
  }

  function addPeriod() {
    if (!canAdd) return
    const id = `${from}_${to}`
    const period: HolidayPeriod = { id, from, to, label: label.trim() }
    update({ periods: [...settings.periods.filter((p) => p.id !== id), period] })
    setFrom('')
    setTo('')
    setLabel('')
  }

  function removePeriod(id: string) {
    update({ periods: settings.periods.filter((p) => p.id !== id) })
  }

  function resetDefaults() {
    update({ ...DEFAULT_SETTINGS, periods: settings.periods, subjects: settings.subjects })
  }

  return (
    <section className="rounded-2xl bg-surface p-4">
      <h2 className="text-[15px] font-semibold text-ink">Révisions</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        Ajuste le temps que l’app te propose de réviser chaque jour.
      </p>

      <Group title="Jours de semaine" hint="Du lundi au vendredi.">
        {row('weekdayMin', 'Minimum', 10, formatMinutes)}
        {row('weekdayMax', 'Maximum', 30, formatMinutes)}
      </Group>

      <Group title="Week-end" hint="Samedi et dimanche.">
        {row('weekendMin', 'Minimum', 30, formatMinutes)}
        {row('weekendMax', 'Maximum', 60, formatMinutes)}
      </Group>

      <Group title="Avant une évaluation" hint="Réglages appliqués les jours qui précèdent une évaluation.">
        {row('evalMax', 'Maximum par jour', 30, formatMinutes)}
        {row('evalShare', 'Part pour la matière', 0.05, formatShare)}
      </Group>

      <Group title="Vacances" hint="Pendant ces périodes, aucune révision n’est planifiée.">
        {settings.periods.length > 0 && (
          <ul className="divide-y divide-line">
            {settings.periods.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-ink">{p.label || 'Vacances'}</p>
                  <p className="text-[12px] tabular-nums text-ink-soft">
                    {formatDay(p.from)} → {formatDay(p.to)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePeriod(p.id)}
                  className="shrink-0 text-[13px] font-medium text-ink-soft transition active:opacity-60"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <span className="mb-1 block text-[12px] text-ink-soft">Du</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                const v = e.target.value
                setFrom(v)
                if (to === '' || to < v) setTo(v)
              }}
              className={field}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[12px] text-ink-soft">Au</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className={field}
            />
          </label>
        </div>
        <input
          type="text"
          value={label}
          maxLength={60}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nom (facultatif), ex. Vacances de Noël"
          className={`${field} mt-2`}
        />
        <button
          type="button"
          onClick={addPeriod}
          disabled={!canAdd}
          className="mt-3 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-surface transition active:opacity-60 disabled:opacity-40"
        >
          Ajouter la période
        </button>
      </Group>

      <Group title="Mots-clés d’évaluation">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Un cours dont le titre contient l’un de ces mots est considéré comme une évaluation.
            Sépare-les par des virgules.
          </p>
          {!wordsAreDefault && (
            <button
              type="button"
              onClick={() => update({ evalWords: [...DEFAULT_EVAL_WORDS] })}
              className="shrink-0 text-[13px] font-medium text-ink-soft transition active:opacity-60"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <textarea
          key={wordsText}
          rows={2}
          defaultValue={wordsText}
          onBlur={(e) => commitWords(e.currentTarget.value)}
          aria-label="Mots-clés d’évaluation"
          className={`${field} mt-2 resize-none`}
        />
      </Group>

      <div className="mt-5 border-t border-line pt-4">
        <button type="button" onClick={resetDefaults} className={btn}>
          Rétablir les valeurs par défaut
        </button>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
          Durées et mots-clés uniquement : tes vacances et tes réglages par matière sont conservés.
        </p>
      </div>
    </section>
  )
}
