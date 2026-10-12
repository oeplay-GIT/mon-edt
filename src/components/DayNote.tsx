import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (text: string) => void
}

/** Note du jour : sauvegarde automatique pendant la frappe. */
export default function DayNote({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Focus + curseur en fin de texte à l'ouverture
  useEffect(() => {
    if (!editing) return
    const el = ref.current
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  // Hauteur automatique
  useEffect(() => {
    const el = ref.current
    if (!editing || !el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [editing, draft])

  if (editing) {
    return (
      <div className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-accent/40">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
            Note du jour
          </span>
          <button
            onClick={() => setEditing(false)}
            className="rounded-full px-2 py-0.5 text-[14px] font-medium text-accent active:opacity-60"
          >
            OK
          </button>
        </div>
        <textarea
          ref={ref}
          value={draft}
          rows={2}
          placeholder="Écris ta note ici…"
          onChange={(e) => {
            setDraft(e.target.value)
            onChange(e.target.value)
          }}
          className="block w-full resize-none bg-transparent text-[16px] leading-snug text-ink outline-none placeholder:text-ink-soft"
        />
      </div>
    )
  }

  if (draft.trim() === '') {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-left text-[14px] text-ink-soft active:opacity-60"
      >
        + Ajouter une note
      </button>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="block w-full rounded-2xl bg-surface px-4 py-3 text-left active:opacity-70"
    >
      <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Note du jour
      </span>
      <span className="mt-1 line-clamp-3 block whitespace-pre-wrap text-[15px] leading-snug text-ink [overflow-wrap:anywhere]">
        {draft}
      </span>
    </button>
  )
}
