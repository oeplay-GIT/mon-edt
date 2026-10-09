import { Fragment } from 'react';
import type { Course } from '../types';
import { formatDuration, isSameDay, minutesBetween } from '../lib/date';
import CourseCard, { type CourseState } from './CourseCard';

interface Props {
  date: Date;
  courses: Course[]; // cours déjà filtrés pour ce jour, triés par heure
  now: Date;
  /** Prochain jour qui contient des cours (null s'il n'y en a plus). */
  nextDate: Date | null;
  onGoToNext: () => void;
}

const MIN_GAP = 30; // on n'affiche une pause qu'à partir de 30 min

function stateOf(course: Course, date: Date, now: Date): CourseState {
  if (!isSameDay(date, now)) return 'upcoming';
  if (now >= course.start && now < course.end) return 'live';
  return now >= course.end ? 'past' : 'upcoming';
}

export default function DayView({ date, courses, now, nextDate, onGoToNext }: Props) {
  if (courses.length === 0) {
    const label = nextDate
      ? nextDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : null;
    return (
      <div className="flex flex-col items-center px-8 py-24 text-center">
        <p className="text-[17px] font-semibold">Aucun cours</p>
        <p className="mt-1 text-[15px] text-ink-soft">
          {nextDate ? 'Profitez de cette journée libre.' : 'Aucun cours à venir dans ton planning.'}
        </p>
        {label && (
          <button
            onClick={onGoToNext}
            className="mt-6 rounded-full bg-surface px-5 py-2.5 text-[15px] font-medium text-accent active:opacity-60"
          >
            Prochain cours : {label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 px-5 pb-10">
      {courses.map((course, i) => {
        const prev = courses[i - 1];
        const gap = prev ? minutesBetween(prev.end, course.start) : 0;
        return (
          <Fragment key={course.id}>
            {gap >= MIN_GAP && (
              <p className="py-1 pl-16 text-[13px] text-ink-soft">
                Pause · {formatDuration(gap)}
              </p>
            )}
            <CourseCard course={course} state={stateOf(course, date, now)} />
          </Fragment>
        );
      })}
    </div>
  );
}
