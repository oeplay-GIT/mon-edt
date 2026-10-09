import ICAL from 'ical.js';
import type { Course } from '../types';

/**
 * ─── PARSEUR ICS POUR ADE CAMPUS (USMB / grenet.fr) ────────────
 * Format réel observé :
 *   SUMMARY:RES105 Bases des systèmes d'exploitation
 *   LOCATION:C274 (42p.)
 *   DESCRIPTION:B2_RT1\nPOURRAZ FREDERIC\n(Exporté le:...)
 *
 * Toutes les hypothèses sur ce format sont isolées dans ce fichier.
 */

/** Code de cours du type RES105, MAT201A, INF 101… */
const CODE_RE = /\b[A-Z]{2,5}\s?\d{2,4}[A-Z]?\b/;

/** Une ligne uniquement composée de lettres, espaces, tirets, apostrophes = un nom de personne. */
const PERSON_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;

/** Ligne de métadonnées ajoutée par ADE : « (Exporté le:…) » */
function isExportLine(line: string): boolean {
  return line.toLowerCase().startsWith('(export');
}

/** « POURRAZ FREDERIC » → « Pourraz Frederic » (ne touche pas aux noms déjà en casse mixte). */
function prettifyName(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-'),
    )
    .join(' ');
}

/** Retire la capacité « (42p.) » à la fin d'un nom de salle. */
function stripCapacity(room: string): string {
  const i = room.indexOf('(');
  if (i === -1) return room.trim();
  const inside = room.slice(i + 1).trim();
  const looksLikeCapacity = /^[0-9]+\s*p/i.test(inside);
  return (looksLikeCapacity ? room.slice(0, i) : room).trim();
}

/** « C274 (42p.) » → « C274 » ; gère plusieurs salles séparées par des virgules. */
function parseLocation(location: string): string {
  return location
    .split(',')
    .map(stripCapacity)
    .filter(Boolean)
    .join(', ');
}

/** Sépare la DESCRIPTION en enseignants et groupes. */
function parseDescription(description: string): { teacher: string; groups: string[] } {
  const lines = description
    .split(/\r?\n|\\n/) // vrai saut de ligne, ou « \n » littéral par sécurité
    .map((l) => l.trim())
    .filter((l) => l && !isExportLine(l));

  const teachers: string[] = [];
  const groups: string[] = [];
  for (const line of lines) {
    const isGroup = /[0-9_]/.test(line) || !PERSON_RE.test(line);
    if (isGroup) groups.push(line);
    else teachers.push(prettifyName(line));
  }
  return { teacher: teachers.join(', '), groups };
}

/** Convertit le texte d'un fichier .ics en liste de cours triée par date. */
export function parseIcs(icsText: string): Course[] {
  const root = new ICAL.Component(ICAL.parse(icsText));
  const courses: Course[] = [];

  for (const vevent of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent);
    if (!event.startDate || !event.endDate) continue;

    const summary = (event.summary ?? '').trim();
    const code = summary.match(CODE_RE)?.[0];
    const rest = code
      ? summary.replace(code, '').replace(/^[ \-–:_/]+|[ \-–:_/]+$/g, '')
      : '';
    const { teacher, groups } = parseDescription(event.description ?? '');

    courses.push({
      id: `${event.uid}-${event.startDate.toString()}`,
      title: code ?? (summary || 'Événement'),
      subtitle: rest,
      colorKey: code ?? summary,
      start: event.startDate.toJSDate(),
      end: event.endDate.toJSDate(),
      room: parseLocation(event.location ?? ''),
      teacher,
      groups,
    });
  }

  return courses.sort((a, b) => a.start.getTime() - b.start.getTime());
}
