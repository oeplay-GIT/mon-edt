import type { Course } from '../types';

const URL_KEY = 'edt:url';
const CACHE_KEY = 'edt:cache';

export const loadUrl = (): string | null => localStorage.getItem(URL_KEY);
export const saveUrl = (url: string) => localStorage.setItem(URL_KEY, url);

interface Cache {
  updatedAt: string;
  courses: Array<Omit<Course, 'start' | 'end'> & { start: string; end: string }>;
}

/** Sauvegarde le dernier planning pour un usage hors-ligne. */
export function saveCache(courses: Course[]) {
  const cache: Cache = {
    updatedAt: new Date().toISOString(),
    courses: courses.map((c) => ({ ...c, start: c.start.toISOString(), end: c.end.toISOString() })),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota dépassé : on ignore, le cache est facultatif */
  }
}

export function loadCache(): { courses: Course[]; updatedAt: Date } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Cache;
    return {
      updatedAt: new Date(cache.updatedAt),
      courses: cache.courses.map((c) => ({ ...c, start: new Date(c.start), end: new Date(c.end) })),
    };
  } catch {
    return null;
  }
}

export const clearCache = () => localStorage.removeItem(CACHE_KEY);
