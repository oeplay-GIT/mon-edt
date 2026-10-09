import { useEffect, useState } from 'react';
import { dayKey, isSameDay, monthGrid, monthLabel } from '../lib/date';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface Props {
  selected: Date;
  today: Date;
  /** Clés « AAAA-MM-JJ » des jours ayant au moins un cours (affiche un point). */
  daysWithCourses: Set<string>;
  onSelect: (d: Date) => void;
  onClose: () => void;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Petit calendrier mensuel, sans librairie. Se ferme avec Échap. */
export default function DatePicker({ selected, today, daysWithCourses, onSelect, onClose }: Props) {
  // Mois affiché (indépendant du jour sélectionné tant qu'on n'a pas cliqué)
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const days = monthGrid(month);

  return (
    <div
      role="dialog"
      aria-label="Choisir une date"
      className="w-[304px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line bg-surface p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-none"
    >
      {/* Navigation de mois */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={() => shiftMonth(-1)}
          aria-label="Mois précédent"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft active:bg-line"
        >
          <ChevronLeftIcon />
        </button>
        <span className="text-[15px] font-semibold">{monthLabel(month)}</span>
        <button
          onClick={() => shiftMonth(1)}
          aria-label="Mois suivant"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft active:bg-line"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Initiales des jours */}
      <div className="grid grid-cols-7 pb-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-center text-[11px] font-medium text-ink-soft">
            {w}
          </span>
        ))}
      </div>

      {/* Grille du mois */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const inMonth = d.getMonth() === month.getMonth();
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          const hasCourses = daysWithCourses.has(dayKey(d));
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelect(d)}
              aria-label={d.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              aria-pressed={isSelected}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[15px] tabular-nums transition-colors ${
                isSelected
                  ? 'bg-ink font-semibold text-canvas'
                  : isToday
                    ? 'font-semibold text-accent active:bg-line'
                    : inMonth
                      ? 'text-ink active:bg-line'
                      : 'text-ink-soft/50 active:bg-line'
              }`}
            >
              {d.getDate()}
              {hasCourses && (
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                    isSelected ? 'bg-canvas' : 'bg-accent'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Raccourci */}
      <button
        onClick={() => onSelect(today)}
        className="mt-2 w-full rounded-xl py-2 text-[14px] font-medium text-accent active:opacity-60"
      >
        Aujourd'hui
      </button>
    </div>
  );
}
