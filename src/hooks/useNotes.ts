import { useCallback, useMemo, useState } from 'react'
import { loadNotes, saveNotes, type NotesMap } from '../lib/notes'

export function useNotes() {
  const [notes, setNotes] = useState<NotesMap>(loadNotes)

  const setNote = useCallback((key: string, text: string) => {
    setNotes((prev) => {
      const next = { ...prev }
      if (text.trim() === '') delete next[key]
      else next[key] = text
      saveNotes(next)
      return next
    })
  }, [])

  const noteDays = useMemo(() => new Set(Object.keys(notes)), [notes])

  return { notes, setNote, noteDays }
}
