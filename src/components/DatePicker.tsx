import { useEffect, useState } from 'react';
import { addDays, dayKey, isSameDay, startOfWeek } from '../lib/date';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface Props {
  selected: Date;
  today: Date;
  daysWithCourses: Set<string>;
  examDays?: Set<string>;
  noteDays?: Set<string>;
  onSelect: (d: Date) => void;
  onClose: () => void;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function DatePicker({
  selected,
  today,
  daysWithCourses,
  examDays,
  noteDays,
  onSelect,
  onClose,
}: Props) {
  const [view, setView] = useState({ year: selected.getFullYear(), month: selected.getMonth() });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const first = new Date(view.year, view.month, 1);
  const start = startOfWeek(first);
  let cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const sixthWeekStart = cells[35];
  if (sixthWeekStart && sixthWeekStart.getMonth() !== view.month) {
    cells = cells.slice(0, 35);
  }

  const label = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="w-[19rem] max-w-[calc(100vw-2.5rem)] rounded-3xl bg-surface p-4 shadow-xl ring-1 ring-line">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          aria-label="Mois précédent"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:bg-line"
        >
          <ChevronLeftIcon />
        </button>
        <span className="text-[16px] font-semibold capitalize text-ink">{label}</span>
        <button
          onClick={() => shift(1)}
          aria-label="Mois suivant"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:bg-line"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1 text-center text-[11px] font-medium text-ink-soft">
            {w}
          </span>
        ))}
        {cells.map((d) => {
          const key = dayKey(d);
          const inMonth = d.getMonth() === view.month;
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          const hasExam = examDays?.has(key) ?? false;
          const hasCourses = daysWithCourses.has(key);
          const hasNote = noteDays?.has(key) ?? false;
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelect(d)}
              aria-label={d.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              className={`flex h-11 flex-col items-center justify-center gap-0.5 outline-none ${
                inMonth ? '' : 'opacity-40'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] tabular-nums ${
                  isSelected
                    ? 'bg-ink font-semibold text-canvas'
                    : isToday
                      ? 'font-semibold text-accent'
                      : 'text-ink'
                }`}
              >
                {d.getDate()}
              </span>
              <span className="flex h-1 items-center gap-0.5">
                {(hasExam || hasCourses) && (
                  <span
                    className={`h-1 w-1 rounded-full ${hasExam ? 'bg-red-500' : 'bg-accent'}`}
                  />
                )}
                {hasNote && <span className="h-1 w-1 rounded-full bg-amber-400" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
