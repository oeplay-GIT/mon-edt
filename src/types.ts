/** Un cours, normalisé à partir d'un VEVENT iCalendar. */
export interface Course {
  id: string;
  /** Libellé principal : code du cours (ex. « RES105 ») ou, à défaut, le titre brut. */
  title: string;
  /** Complément éventuel (ex. « Bases des systèmes d'exploitation »). */
  subtitle: string;
  /** Clé servant à attribuer une couleur stable à la matière. */
  colorKey: string;
  start: Date;
  end: Date;
  room: string;
  teacher: string;
  groups: string[];
}
