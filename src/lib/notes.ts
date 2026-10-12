const NOTES_KEY = 'edt:notes'

export type NotesMap = Record<string, string>

export function sanitizeNotes(input: unknown): NotesMap {
  const out: NotesMap = {}
  if (!input || typeof input !== 'object') return out
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim() !== '') out[key] = value
  }
  return out
}

export function loadNotes(): NotesMap {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return {}
    return sanitizeNotes(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function saveNotes(notes: NotesMap): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  } catch {
    // ignore
  }
}
