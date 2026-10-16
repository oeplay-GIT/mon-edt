import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { loadNotes, sanitizeNotes, saveNotes } from '../lib/notes'
import { sanitizeSettings } from '../lib/rev/settings'
import { useRevSettings } from '../lib/rev/useRevSettings'

const btn =
  'rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink transition active:opacity-60 disabled:opacity-40'

function parseBackup(text: string) {
  const data = JSON.parse(text)
  const obj = data && typeof data === 'object' ? data : {}
  const hasWrapper = 'notes' in obj || 'rev' in obj || obj.app === 'mon-edt'
  const rawNotes = 'notes' in obj ? obj.notes : hasWrapper ? {} : obj
  const notes = sanitizeNotes(rawNotes)
  const rev = obj.rev && typeof obj.rev === 'object' ? sanitizeSettings(obj.rev) : null
  return { notes, rev }
}

function summary(count: number, hasRev: boolean): string {
  const parts: string[] = []
  if (count > 0) parts.push(count === 1 ? '1 note' : `${count} notes`)
  if (hasRev) parts.push('réglages de révision')
  return `Importé : ${parts.join(' et ')}.`
}

export default function NotesBackup() {
  const { settings, replace } = useRevSettings()
  const [msg, setMsg] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [pasted, setPasted] = useState('')

  function buildBackup(): string {
    return JSON.stringify(
      { app: 'mon-edt', version: 2, notes: loadNotes(), rev: settings },
      null,
      2,
    )
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildBackup())
      setMsg('Sauvegarde copiée. Colle-la dans une note ou un message à toi-même.')
    } catch {
      setMsg('Copie impossible : utilise « Télécharger ».')
    }
  }

  function download() {
    const blob = new Blob([buildBackup()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mon-edt-sauvegarde.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMsg('Fichier téléchargé.')
  }

  function importText(text: string) {
    try {
      const { notes, rev } = parseBackup(text)
      const count = Object.keys(notes).length
      if (count === 0 && !rev) {
        setMsg('Aucune note ni réglage trouvé dans ce contenu.')
        return
      }
      if (count > 0) saveNotes({ ...loadNotes(), ...notes })
      if (rev) replace(rev)
      setMsg(`${summary(count, rev !== null)} Rechargement…`)
      window.setTimeout(() => window.location.reload(), 900)
    } catch {
      setMsg('Contenu invalide.')
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      importText(await file.text())
    } catch {
      setMsg('Lecture du fichier impossible.')
    }
  }

  return (
    <section className="rounded-2xl bg-surface p-4">
      <h2 className="text-[15px] font-semibold text-ink">Sauvegarde</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        Tes notes et tes réglages de révision sont stockés uniquement sur cet appareil.
        Sauvegarde-les avant de réinstaller l’app.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={btn}>
          Copier
        </button>
        <button type="button" onClick={download} className={btn}>
          Télécharger
        </button>
        <button
          type="button"
          onClick={() => {
            setRestoring((r) => !r)
            setMsg('')
          }}
          className={btn}
        >
          Restaurer
        </button>
      </div>

      {restoring && (
        <div className="mt-3 space-y-2">
          <textarea
            rows={4}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Colle ici la sauvegarde copiée…"
            className="w-full rounded-xl border border-line bg-transparent p-3 text-[16px] text-ink outline-none focus:border-ink-soft"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => importText(pasted)}
              disabled={pasted.trim() === ''}
              className={btn}
            >
              Importer le texte
            </button>
            <label className={`${btn} cursor-pointer`}>
              Choisir un fichier
              <input
                type="file"
                accept=".json,application/json,text/plain"
                onChange={onFile}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{msg}</p>}
    </section>
  )
}
