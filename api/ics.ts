import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Doit rester identique à la liste de vite.config.ts */
const ALLOWED_SUFFIXES = ['.grenet.fr'];

/**
 * GET /api/ics?url=<url-ade-encodée>
 * Télécharge le .ics côté serveur et le renvoie au navigateur.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!raw) return res.status(400).send('Paramètre "url" manquant.');

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).send('URL invalide.');
  }

  const allowed =
    target.protocol === 'https:' && ALLOWED_SUFFIXES.some((s) => target.hostname.endsWith(s));
  if (!allowed) return res.status(403).send('Domaine non autorisé.');

  try {
    const upstream = await fetch(target);
    const text = await upstream.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(upstream.status).send(text);
  } catch {
    return res.status(502).send('Impossible de joindre le serveur ADE.');
  }
}
