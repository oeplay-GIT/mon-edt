import { useCallback, useSyncExternalStore } from 'react'
import * as exam from '../exam'
import { loadSettings, sanitizeSettings, saveSettings } from './settings'
import type { RevSettings, SubjectPref } from './settings'

let current: RevSettings | null = null
const listeners = new Set<() => void>()

function getSnapshot(): RevSettings {
  if (current === null) current = loadSettings()
  return current
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Garde l’ancien stockage des mots-clés synchronisé (libellés de l’emploi du temps)
function syncLegacyWords(words: string[]): void {
  try {
    const legacy = exam as unknown as { saveExamWords?: (words: string[]) => void }
    legacy.saveExamWords?.(words)
  } catch {
    // ignoré : l’ancien stockage est facultatif
  }
}

function commit(next: RevSettings): void {
  const prev = getSnapshot()
  current = next
  saveSettings(next)
  if (prev.evalWords.join('\n') !== next.evalWords.join('\n')) {
    syncLegacyWords(next.evalWords)
  }
  listeners.forEach((listener) => listener())
}

export function useRevSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const update = useCallback((patch: Partial<RevSettings>) => {
    commit(sanitizeSettings({ ...getSnapshot(), ...patch }))
  }, [])

  const setSubject = useCallback((key: string, pref: SubjectPref | null) => {
    const subjects = { ...getSnapshot().subjects }
    if (pref === null) delete subjects[key]
    else subjects[key] = pref
    commit({ ...getSnapshot(), subjects })
  }, [])

  const replace = useCallback((next: RevSettings) => {
    commit(next)
  }, [])

  return { settings, update, setSubject, replace }
}
