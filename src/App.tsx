import { useEffect, useMemo, useState } from 'react';
import { BottomNav, type Tab } from './components/BottomNav';
import DatePicker from './components/DatePicker';
import DayNote from './components/DayNote';
import DayView from './components/DayView';
import { CalendarIcon, GearIcon, RefreshIcon } from './components/Icons';
import { RevisionsView } from './components/RevisionsView';
import SettingsScreen from './components/SettingsScreen';
import StatsScreen from './components/StatsScreen';
import WeekStrip from './components/WeekStrip';
import { useNotes } from './hooks/useNotes';
import { useNow } from './hooks/useNow';
import { useSchedule } from './hooks/useSchedule';
import { useTheme } from './hooks/useTheme';
import { addDays, dayKey, dayLong, dayTitle, isSameDay, startOfDay, timeAgo } from './lib/date';
import { courseLabel } from './lib/exam';
import { analyzeAll } from './lib/rev/analyze';
import { createPlanner } from './lib/rev/planner';
import { buildSubjects } from './lib/rev/subjects';
import { useRevSettings } from './lib/rev/useRevSettings';
import { clearCache, loadUrl, saveUrl } from './lib/storage';
import type { Course } from './types';

export default function App() {
  const [url, setUrl] = useState(loadUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [tab, setTab] = useState<Tab>('cours');
  const [statsOpen, setStatsOpen] = useState(false);

  const now = useNow();
  const { courses, updatedAt, status, error, refresh, reset } = useSchedule(url);
  const { notes, setNote, noteDays } = useNotes();
  const { pref: themePref, setPref: setThemePref } = useTheme();
  const { settings, setSubject } = useRevSettings();

  // "Aujourd'hui" ne change qu'une fois par jour : on évite de tout recalculer toutes les 30 s.
  const todayTs = startOfDay(now).getTime();
  const today = useMemo(() => new Date(todayTs), [todayTs]);

  const byDay = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const c of courses) {
      const key = dayKey(c.start);
      const list = map.get(key);
      if (list) list.push(c);
      else map.set(key, [c]);
    }
    return map;
  }, [courses]);

  const items = useMemo(
    () => analyzeAll(courses, settings.evalWords),
    [courses, settings.evalWords],
  );
  const subjects = useMemo(() => buildSubjects(items, settings), [items, settings]);
  const planner = useMemo(
    () => createPlanner(items, subjects, settings, today),
    [items, subjects, settings, today],
  );

  const { examDays, evalIds } = useMemo(() => {
    const days = new Set<string>();
    const ids = new Set<Course['id']>();
    for (const { course, info } of items) {
      if (!info.isExam) continue;
      days.add(dayKey(course.start));
      ids.add(course.id);
    }
    return { examDays: days, evalIds: ids };
  }, [items]);

  useEffect(() => {
    if (tab !== 'cours' || pickerOpen || statsOpen || showSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      const step = e.shiftKey ? 7 : 1;
      setSelected((d) => addDays(d, e.key === 'ArrowLeft' ? -step : step));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, pickerOpen, statsOpen, showSettings]);

  const handleSave = (newUrl: string) => {
    if (newUrl !== url) {
      clearCache();
      reset();
    }
    saveUrl(newUrl);
    setUrl(newUrl);
    setShowSettings(false);
  };

  if (!url || showSettings) {
    return (
      <SettingsScreen
        initialUrl={url ?? ''}
        onSave={handleSave}
        theme={themePref}
        onThemeChange={setThemePref}
        onCancel={url ? () => setShowSettings(false) : undefined}
      />
    );
  }

  if (statsOpen) {
    return (
      <StatsScreen
        items={items}
        subjects={subjects}
        planner={planner}
        settings={settings}
        now={now}
        onBack={() => setStatsOpen(false)}
      />
    );
  }

  const selectedKey = dayKey(selected);
  const dayCourses = byDay.get(selectedKey) ?? [];
  const dayExams = dayCourses.filter((c) => evalIds.has(c.id));
  const daysWithCourses = new Set(byDay.keys());

  const afterSelected = addDays(selected, 1);
  const nextCourse = courses.find((c) => c.start >= afterSelected);
  const nextDate = nextCourse ? startOfDay(nextCourse.start) : null;

  const actions = (
    <div className="flex shrink-0 items-center text-ink-soft">
      <button
        type="button"
        onClick={refresh}
        aria-label="Actualiser"
        className="rounded-full p-2 active:bg-line"
      >
        <RefreshIcon className={status === 'loading' ? 'animate-spin' : ''} />
      </button>
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        aria-label="Réglages"
        className="rounded-full p-2 active:bg-line"
      >
        <GearIcon />
      </button>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col overflow-x-clip">
      {tab === 'cours' ? (
        <>
          <header className="sticky top-0 z-10 bg-canvas pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between gap-2 px-5 pt-5">
              <h1 className="min-w-0 flex-1 truncate text-[32px] font-bold leading-[1.15] tracking-tight">
                {dayTitle(selected, today)}
              </h1>
              {actions}
            </div>

            <div className="flex items-center justify-between gap-2 px-5 pb-2">
              <p className="text-[15px] text-ink-soft">{dayLong(selected)}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  aria-label="Ouvrir le calendrier"
                  className="shrink-0 rounded-full p-1.5 text-ink-soft active:bg-line"
                >
                  <CalendarIcon />
                </button>
                {!isSameDay(selected, today) && (
                  <button
                    type="button"
                    onClick={() => setSelected(today)}
                    className="shrink-0 whitespace-nowrap rounded-full bg-line px-3 py-1 text-[13px] font-medium text-accent active:opacity-60"
                  >
                    Aujourd'hui
                  </button>
                )}
              </div>
            </div>

            <WeekStrip
              selected={selected}
              today={today}
              daysWithCourses={daysWithCourses}
              examDays={examDays}
              noteDays={noteDays}
              onSelect={setSelected}
              onShiftWeek={(dir) => setSelected((d) => addDays(d, dir * 7))}
            />
            <div className="mt-2 h-px bg-line" />
          </header>

          {pickerOpen && (
            <div className="fixed inset-0 z-20" onClick={() => setPickerOpen(false)}>
              <div className="relative mx-auto h-full max-w-md">
                <div
                  className="absolute left-5 top-[calc(env(safe-area-inset-top)+6.5rem)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DatePicker
                    selected={selected}
                    today={today}
                    daysWithCourses={daysWithCourses}
                    examDays={examDays}
                    noteDays={noteDays}
                    onSelect={(d) => {
                      setSelected(startOfDay(d));
                      setPickerOpen(false);
                    }}
                    onClose={() => setPickerOpen(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <p className="mx-5 mt-4 rounded-xl bg-surface px-4 py-3 text-[14px] leading-snug text-ink-soft [overflow-wrap:anywhere]">
              Mise à jour impossible : {error}
              {updatedAt && ` Dernière synchro : ${timeAgo(updatedAt)}.`}
            </p>
          )}

          <main className="min-w-0 flex-1 pt-5">
            <div className="space-y-3 px-5 pb-4">
              {dayExams.length > 0 && (
                <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400">
                  <p className="text-[12px] font-semibold uppercase tracking-wide">
                    {dayExams.length > 1 ? 'Examens ce jour' : 'Examen ce jour'}
                  </p>
                  {dayExams.map((c) => (
                    <p
                      key={c.id}
                      className="mt-0.5 text-[15px] leading-snug [overflow-wrap:anywhere]"
                    >
                      {c.start.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {` · ${courseLabel(c)}`}
                    </p>
                  ))}
                </div>
              )}

              <DayNote
                key={selectedKey}
                value={notes[selectedKey] ?? ''}
                onChange={(text) => setNote(selectedKey, text)}
              />
            </div>

            <DayView
              date={selected}
              courses={dayCourses}
              now={now}
              nextDate={nextDate}
              isEval={(c) => evalIds.has(c.id)}
              onGoToNext={() => nextDate && setSelected(nextDate)}
            />
          </main>

          <footer className="px-5 pb-28 text-center text-[12px] text-ink-soft">
            {updatedAt && status !== 'error' ? `Mis à jour le ${timeAgo(updatedAt)}` : null}
          </footer>
        </>
      ) : (
        <>
          <header className="sticky top-0 z-10 bg-canvas pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-5">
              <h1 className="min-w-0 flex-1 truncate text-[32px] font-bold leading-[1.15] tracking-tight">
                Révisions
              </h1>
              {actions}
            </div>
            <div className="h-px bg-line" />
          </header>

          <main className="min-w-0 flex-1 pt-5">
            <RevisionsView
              planner={planner}
              subjects={subjects}
              items={items}
              now={now}
              onSubjectChange={setSubject}
              onOpenStats={() => setStatsOpen(true)}
            />
          </main>
        </>
      )}

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
