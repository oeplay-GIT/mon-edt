import { Fragment } from 'react';
import type { Course } from '../types';
import { formatDuration, isSameDay, minutesBetween } from '../lib/date';
import CourseCard, { type CourseState } from './CourseCard';

type Props = {
  date: Date;
  courses: Course[];
  now: Date;
  nextDate: Date | null;
  isEval: (course: Course) => boolean;
  onGoToNext: () => void;
};

const MIN_GAP = 30;

function stateOf(course: Course, date: Date, now: Date): CourseState {
  if (!isSameDay(date, now)) return date < now ? 'past' : 'upcoming';
  if (now >= course.end) return 'past';
  if (now >= course.start) return 'live';
  return 'upcoming';
}

export default function DayView({ date, courses, now, nextDate, isEval, onGoToNext }: Props) {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center px-8 py-24 text-center">
        <p className="text-[20px] font-semibold text-ink">Aucun cours</p>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          {nextDate
            ? 'Profitez de cette journée libre.'
            : 'Aucun cours à venir dans ton planning.'}
        </p>
        {nextDate && (
          <button
            type="button"
            onClick={onGoToNext}
            className="mt-6 rounded-full bg-surface px-5 py-2.5 text-[15px] font-medium text-accent active:opacity-60"
          >
            Prochain cours :{' '}
            {nextDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3 px-5 pb-10">
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
            <CourseCard
              course={course}
              state={stateOf(course, date, now)}
              isEval={isEval(course)}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
