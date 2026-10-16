import { useState } from 'react'
import NotesBackup from './NotesBackup'
import RevSettingsPanel from './RevSettingsPanel'

function formatBuild(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
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
  } finally {
    window.location.reload()
  }
}

export default function VersionInfo() {
  const [busy, setBusy] = useState(false)
  const build = formatBuild(__BUILD_TIME__)

  async function refresh() {
    setBusy(true)
    await hardRefresh()
  }

  return (
    <div className="mt-6 space-y-4 pb-6">
      <RevSettingsPanel />
      <NotesBackup />

      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
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
