export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Lundi de la semaine contenant `d`. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

/** Clé « AAAA-MM-JJ » en heure locale. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const formatTime = (d: Date) =>
  d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000);

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Aujourd'hui », « Demain », « Hier » ou le nom du jour. */
export function dayTitle(d: Date, today = new Date()): string {
  if (isSameDay(d, today)) return "Aujourd'hui";
  if (isSameDay(d, addDays(today, 1))) return 'Demain';
  if (isSameDay(d, addDays(today, -1))) return 'Hier';
  return capitalize(d.toLocaleDateString('fr-FR', { weekday: 'long' }));
}

/** « 9 octobre 2026 » */
export const dayLong = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Initiale du jour pour le bandeau de semaine (L, M, M, J, V, S, D). */
export const weekdayInitial = (d: Date) =>
  d.toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase();

export const timeAgo = (d: Date) =>
  d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/**
 * Toutes les dates à afficher pour la grille d'un mois (lundi en premier).
 * Inclut les jours des mois voisins pour compléter les semaines.
 */
export function monthGrid(month: Date): Date[] {
  const y = month.getFullYear();
  const m = month.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // jours avant le 1er
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => new Date(y, m, 1 - offset + i));
}

/** « Octobre 2026 » */
export const monthLabel = (d: Date) =>
  capitalize(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
