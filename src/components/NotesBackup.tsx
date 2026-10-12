import { useState } from 'react'
import { loadNotes, sanitizeNotes, saveNotes } from '../lib/notes'

function buildBackup(): string {
  return JSON.stringify({ app: 'mon-edt', version: 1, notes: loadNotes() }, null, 2)
}

function parseBackup(text: string) {
  const data: unknown = JSON.parse(text)
  const source =
    data && typeof data === 'object' && 'notes' in data
      ? (data as { notes: unknown }).notes
      : data
  return sanitizeNotes(source)
}

export default function NotesBackup() {
  const [msg, setMsg] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [pasted, setPasted] = useState('')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildBackup())
      setMsg('Sauvegarde copiée. Colle-la dans une note ou un message à toi-même.')
    } catch {
      setMsg('Copie impossible : utilise « Télécharger ».')
    }
  }

  const download = () => {
    const blob = new Blob([buildBackup()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mon-edt-notes.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMsg('Fichier téléchargé.')
  }

  const importText = (text: string) => {
    try {
      const imported = parseBackup(text)
      const count = Object.keys(imported).length
      if (count === 0) {
        setMsg('Aucune note trouvée dans ce contenu.')
        return
      }
      saveNotes({ ...loadNotes(), ...imported })
      setMsg(count + ' note(s) importée(s). Rechargement…')
      window.setTimeout(() => window.location.reload(), 900)
    } catch {
      setMsg('Contenu invalide.')
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    importText(await file.text())
  }

  const btn =
    'rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink active:opacity-60'

  return (
    <section className="rounded-2xl bg-surface p-4">
      <h2 className="text-[15px] font-semibold text-ink">Sauvegarde des notes</h2>
      <p className="mt-1 text-[13px] leading-snug text-ink-soft">
        Tes notes sont stockées uniquement sur cet appareil. Sauvegarde-les avant de
        réinstaller l'app.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => void copy()} className={btn}>
          Copier
        </button>
        <button onClick={download} className={btn}>
          Télécharger
        </button>
        <button onClick={() => setRestoring((v) => !v)} className={btn}>
          Restaurer
        </button>
      </div>

      {restoring && (
        <div className="mt-3 space-y-2">
          <textarea
            value={pasted}
            rows={4}
            placeholder="Colle ici la sauvegarde copiée…"
            onChange={(e) => setPasted(e.target.value)}
            className="block w-full resize-none rounded-xl border border-line bg-transparent px-3 py-2 text-[16px] text-ink outline-none placeholder:text-ink-soft"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => importText(pasted)} className={btn}>
              Importer le texte
            </button>
            <label className={btn + ' cursor-pointer'}>
              Choisir un fichier
              <input
                type="file"
                accept=".json,application/json,text/plain"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-[13px] text-ink-soft">{msg}</p>}
    </section>
  )
}
