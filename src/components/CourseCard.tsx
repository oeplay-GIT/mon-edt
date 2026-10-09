import type { Course } from '../types';
import { toneVars } from '../lib/colors';
import { formatDuration, formatTime, minutesBetween } from '../lib/date';
import { PersonIcon, PinIcon } from './Icons';

export type CourseState = 'upcoming' | 'live' | 'past';

interface Props {
  course: Course;
  state: CourseState;
}

/** Une ligne de la timeline : horaires à gauche, carte pastel à droite. */
export default function CourseCard({ course, state }: Props) {
  const minutes = minutesBetween(course.start, course.end);
  // La hauteur reflète (légèrement) la durée du cours.
  const minHeight = Math.max(92, Math.round(minutes * 0.95));

  return (
    <div className={`flex gap-4 ${state === 'past' ? 'opacity-55' : ''}`}>
      {/* Colonne horaires */}
      <div className="w-12 shrink-0 pt-4 text-right tabular-nums">
        <div className="text-[15px] font-semibold leading-none text-ink">
          {formatTime(course.start)}
        </div>
        <div className="mt-1.5 text-[13px] leading-none text-ink-soft">
          {formatTime(course.end)}
        </div>
      </div>

      {/* Carte : les couleurs viennent des variables --bg / --fg / --bar (clair ou sombre) */}
      <article
        className="tone flex-1 rounded-2xl p-4"
        style={{
          ...toneVars(course.colorKey),
          background: 'var(--bg)',
          color: 'var(--fg)',
          borderLeft: '4px solid var(--bar)',
          minHeight,
        }}
      >
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-semibold leading-tight">{course.title}</h3>
            {course.subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug opacity-80">
                {course.subtitle}
              </p>
            )}
          </div>
          {state === 'live' && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{ background: 'var(--bar)', color: 'var(--badge-fg)' }}
            >
              En cours
            </span>
          )}
        </header>

        <dl className="mt-3 space-y-1.5 text-[14px]">
          {course.room && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Salle</dt>
              <PinIcon className="shrink-0 opacity-70" />
              <dd className="truncate">{course.room}</dd>
            </div>
          )}
          {course.teacher && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Enseignant</dt>
              <PersonIcon className="shrink-0 opacity-70" />
              <dd className="truncate">{course.teacher}</dd>
            </div>
          )}
        </dl>

        <p className="mt-3 text-[12px] opacity-60">
          {formatTime(course.start)} – {formatTime(course.end)} · {formatDuration(minutes)}
          {course.groups.length > 0 && ` · ${course.groups.join(', ')}`}
        </p>
      </article>
    </div>
  );
}
