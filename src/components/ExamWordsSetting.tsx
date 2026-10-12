import { useState } from 'react'
import { DEFAULT_EXAM_WORDS, loadExamWords, saveExamWords } from '../lib/exam'

export default function ExamWordsSetting() {
  const [text, setText] = useState(() => loadExamWords().join(', '))

  const update = (value: string) => {
    setText(value)
    saveExamWords(
      value
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean),
    )
  }

  return (
    <section className="rounded-2xl bg-surface p-4">
      <h2 className="text-[15px] font-semibold text-ink">Détection des examens</h2>
      <p className="mt-1 text-[13px] leading-snug text-ink-soft">
        Un cours dont le titre ou la description contient un de ces mots passe en rouge.
        Sépare les mots par des virgules.
      </p>
      <textarea
        value={text}
        rows={3}
        onChange={(e) => update(e.target.value)}
        className="mt-3 block w-full resize-none rounded-xl border border-line bg-transparent px-3 py-2 text-[16px] text-ink outline-none"
      />
      <button
        onClick={() => update(DEFAULT_EXAM_WORDS.join(', '))}
        className="mt-2 text-[13px] font-medium text-accent active:opacity-60"
      >
        Rétablir la liste par défaut
      </button>
    </section>
  )
}
