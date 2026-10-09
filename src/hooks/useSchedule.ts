import { useCallback, useEffect, useState } from 'react';
import type { Course } from '../types';
import { fetchIcs } from '../lib/fetchIcs';
import { parseIcs } from '../lib/icsParser';
import { loadCache, saveCache } from '../lib/storage';

export type Status = 'idle' | 'loading' | 'error';

/**
 * Charge l'emploi du temps : affiche d'abord le cache (instantané, hors-ligne),
 * puis rafraîchit depuis ADE en arrière-plan.
 */
export function useSchedule(url: string | null) {
  const [cached] = useState(loadCache);
  const [courses, setCourses] = useState<Course[]>(cached?.courses ?? []);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(cached?.updatedAt ?? null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!url) return;
    setStatus('loading');
    setError(null);
    try {
      const parsed = parseIcs(await fetchIcs(url));
      setCourses(parsed);
      setUpdatedAt(new Date());
      saveCache(parsed);
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
      setStatus('error');
    }
  }, [url]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Vide les données (utilisé quand l'utilisateur change d'URL). */
  const reset = useCallback(() => {
    setCourses([]);
    setUpdatedAt(null);
  }, []);

  return { courses, updatedAt, status, error, refresh, reset };
}
