/** Télécharge le .ics via notre proxy (/api/ics) pour éviter le blocage CORS. */
export async function fetchIcs(url: string): Promise<string> {
  const res = await fetch(`/api/ics?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? "Ce domaine n'est pas autorisé par le proxy."
        : `Le serveur ADE a répondu avec une erreur (${res.status}).`,
    );
  }
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error("La réponse n'est pas un fichier iCalendar valide.");
  }
  return text;
}
