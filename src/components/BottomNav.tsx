import type { ReactElement } from 'react'
import { BookTabIcon, CalendarTabIcon } from './RevIcons'

export type Tab = 'cours' | 'revisions'

type Props = {
  tab: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: (className: string) => ReactElement }[] = [
  { id: 'cours', label: 'Cours', icon: (c) => <CalendarTabIcon className={c} /> },
  { id: 'revisions', label: 'Révisions', icon: (c) => <BookTabIcon className={c} /> },
]

export function BottomNav({ tab, onChange }: Props) {
  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-30 bg-canvas/85 backdrop-blur-xl"
    >
      <div className="h-px bg-line" />
      <div className="mx-auto flex w-full max-w-md px-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors ${
                active ? 'text-accent' : 'text-ink-soft'
              }`}
            >
              {t.icon('h-6 w-6')}
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
