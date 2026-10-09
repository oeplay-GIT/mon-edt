import { addDays, dayKey, isSameDay, startOfWeek, weekdayInitial } from '../lib/date';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface Props {
  selected: Date;
  today: Date;
  daysWithCourses: Set<string>;
  onSelect: (d: Date) => void;
  /** -1 = semaine précédente, 1 = semaine suivante */
  onShiftWeek: (direction: -1 | 1) => void;
}

/** Bandeau des 7 jours (lundi → dimanche) avec flèches pour changer de semaine. */
export default function WeekStrip({
  selected,
  today,
  daysWithCourses,
  onSelect,
  onShiftWeek,
}: Props) {
  const monday = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="flex items-center px-1">
      <button
        onClick={() => onShiftWeek(-1)}
        aria-label="Semaine précédente"
        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-line"
      >
        <ChevronLeftIcon />
      </button>

      <div className="grid flex-1 grid-cols-7">
        {days.map((d) => {
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelect(d)}
              className="flex flex-col items-center gap-1.5 py-1 outline-none"
              aria-label={d.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              aria-pressed={isSelected}
            >
              <span className="text-[11px] font-medium uppercase text-ink-soft">
                {weekdayInitial(d)}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[17px] tabular-nums transition-colors ${
                  isSelected
                    ? 'bg-ink font-semibold text-canvas'
                    : isToday
                      ? 'font-semibold text-accent'
                      : 'text-ink'
                }`}
              >
                {d.getDate()}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  daysWithCourses.has(dayKey(d)) ? 'bg-accent' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onShiftWeek(1)}
        aria-label="Semaine suivante"
        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-line"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
