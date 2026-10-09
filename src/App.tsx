import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import DatePicker from './components/DatePicker';
import DayView from './components/DayView';
import SettingsScreen from './components/SettingsScreen';
import WeekStrip from './components/WeekStrip';
import { CalendarIcon, GearIcon, RefreshIcon } from './components/Icons';
import { useNow } from './hooks/useNow';
import { useSchedule } from './hooks/useSchedule';
import { useTheme } from './hooks/useTheme';
import { addDays, dayKey, dayLong, dayTitle, isSameDay, startOfDay, timeAgo } from './lib/date';
import { clearCache, loadUrl, saveUrl } from './lib/storage';

export default function App() {
  const [url, setUrl] = useState<string | null>(loadUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const now = useNow();
  const { pref: themePref, setPref: setThemePref } = useTheme();
  const { courses, updatedAt, status, error, refresh, reset } = useSchedule(url);

  // Index des cours par jour, calculé une seule fois par chargement.
  const byDay = useMemo(() => {
    const map = new Map<string, typeof courses>();
    for (const c of courses) {
      const k = dayKey(c.start);
      map.set(k, [...(map.get(k) ?? []), c]);
    }
    return map;
  }, [courses]);

  // Navigation au clavier (← → = jour, Maj + ← → = semaine) pour l'usage sur PC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pickerOpen) return; // le calendrier gère ses propres touches
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const step = e.shiftKey ? 7 : 1;
      if (e.key === 'ArrowLeft') setSelected((d) => addDays(d, -step));
      if (e.key === 'ArrowRight') setSelected((d) => addDays(d, step));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  // Navigation par glissement horizontal (téléphone)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setSelected((d) => addDays(d, dx < 0 ? 1 : -1));
    }
  };

  const handleSave = (newUrl: string) => {
    if (newUrl !== url) {
      clearCache();
      reset();
    }
    saveUrl(newUrl);
    setUrl(newUrl);
    setShowSettings(false);
  };

  // Écran de configuration (première utilisation ou via l'engrenage)
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

  const today = startOfDay(now);
  const dayCourses = byDay.get(dayKey(selected)) ?? [];
  const daysWithCourses = new Set(byDay.keys());

  // Premier cours situé après le jour sélectionné
  const afterSelected = addDays(selected, 1);
  const nextCourse = courses.find((c) => c.start >= afterSelected);
  const nextDate = nextCourse ? startOfDay(nextCourse.start) : null;

  return (
    <div
      className="mx-auto flex min-h-full max-w-md flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* En-tête fixe */}
      <header className="sticky top-0 z-10 bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex items-start justify-between px-5 pb-3 pt-5">
          <div>
            <h1 className="text-[32px] font-bold leading-none tracking-tight">
              {dayTitle(selected, today)}
            </h1>
            <div className="mt-1.5 flex items-center gap-1">
              <p className="text-[15px] text-ink-soft">{dayLong(selected)}</p>
              <button
                onClick={() => setPickerOpen(true)}
                aria-label="Ouvrir le calendrier"
                aria-expanded={pickerOpen}
                className="rounded-full p-1.5 text-ink-soft active:bg-line"
              >
                <CalendarIcon />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 text-ink-soft">
            {!isSameDay(selected, today) && (
              <button
                onClick={() => setSelected(today)}
                className="mr-1 rounded-full px-3 py-1.5 text-[14px] font-medium text-accent active:opacity-60"
              >
                Aujourd'hui
              </button>
            )}
            <button
              onClick={refresh}
              aria-label="Actualiser"
              className="rounded-full p-2 active:bg-line"
            >
              <RefreshIcon className={status === 'loading' ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Réglages"
              className="rounded-full p-2 active:bg-line"
            >
              <GearIcon />
            </button>
          </div>
        </div>

        <WeekStrip
          selected={selected}
          today={today}
          daysWithCourses={daysWithCourses}
          onSelect={setSelected}
          onShiftWeek={(dir) => setSelected((d) => addDays(d, dir * 7))}
        />
        <div className="mt-2 h-px bg-line" />
      </header>

      {/* Calendrier (popover) */}
      {pickerOpen && (
        // Fond invisible plein écran : un clic à côté ferme le calendrier
        <div className="fixed inset-0 z-20" onClick={() => setPickerOpen(false)}>
          <div className="relative mx-auto h-full max-w-md">
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-5 top-[calc(env(safe-area-inset-top)+6rem)]"
            >
              <DatePicker
                selected={selected}
                today={today}
                daysWithCourses={daysWithCourses}
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

      {/* Bandeau d'erreur discret */}
      {status === 'error' && (
        <p className="mx-5 mt-4 rounded-xl bg-surface px-4 py-3 text-[14px] leading-snug text-ink-soft">
          Mise à jour impossible : {error}
          {updatedAt && ` Dernière synchro : ${timeAgo(updatedAt)}.`}
        </p>
      )}

      <main className="flex-1 pt-5">
        <DayView
          date={selected}
          courses={dayCourses}
          now={now}
          nextDate={nextDate}
          onGoToNext={() => nextDate && setSelected(nextDate)}
        />
      </main>

      {updatedAt && status !== 'error' && (
        <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[12px] text-ink-soft">
          Mis à jour le {timeAgo(updatedAt)}
        </footer>
      )}
    </div>
  );
}
