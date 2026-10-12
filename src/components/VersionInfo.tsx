import { useState } from 'react'
import ExamWordsSetting from './ExamWordsSetting'
import NotesBackup from './NotesBackup'

function formatBuild(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function hardRefresh() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // on recharge quand même
  }
  window.location.reload()
}

export default function VersionInfo() {
  const [busy, setBusy] = useState(false)
  const build = formatBuild(__BUILD_TIME__)

  return (
    <div className="mt-6 space-y-4 pb-6">
      <ExamWordsSetting />
      <NotesBackup />

      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void hardRefresh()
          }}
          className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition active:opacity-60 disabled:opacity-50"
        >
          {busy ? 'Mise à jour…' : 'Rechercher une mise à jour'}
        </button>
        <p className="text-[12px] leading-relaxed tabular-nums text-ink-soft">
          Version {__APP_VERSION__}
          {__APP_COMMIT__ ? ` · ${__APP_COMMIT__}` : ''}
          <br />
          Build du {build}
        </p>
      </div>
    </div>
  )
}
