const HUES = [212, 158, 28, 276, 332, 188, 46, 246, 98, 306]

/** Couleur stable pour une matière (à partir de sa clé). */
export function subjectColor(key: string): string {
  let h = 7
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) % 100003
  }
  return `hsl(${HUES[h % HUES.length]} 62% 52%)`
}

export function capitalize(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

const dayMonthFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const weekdayDayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric' })
const shortDateFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

function noDots(text: string): string {
  return text.replace(/\./g, '')
}

/** « 19 oct » */
export function fmtDayMonth(d: Date): string {
  return noDots(dayMonthFmt.format(d))
}

/** « oct » */
export function fmtMonth(d: Date): string {
  return noDots(monthFmt.format(d))
}

/** « Lundi 19 » */
export function fmtWeekdayDay(d: Date): string {
  return capitalize(weekdayDayFmt.format(d))
}

/** « lun 19 oct » */
export function fmtShortDate(d: Date): string {
  return noDots(shortDateFmt.format(d))
}

/** 11.25 → « 11,25 » */
export function fmtGrade(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',')
}

/** Nombre de jours entre deux dates (à minuit, local). */
export function daysUntil(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((b - a) / 86400000)
}

export function fmtCountdown(days: number): string {
  if (days <= 0) return 'Aujourd’hui'
  if (days === 1) return 'Demain'
  return `Dans ${days} j`
}
