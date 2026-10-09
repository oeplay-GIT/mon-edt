export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'edt:theme';
const SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function loadThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'light';
}

export const saveThemePref = (p: ThemePref) => localStorage.setItem(KEY, p);

export const systemQuery = () => window.matchMedia(SCHEME_QUERY);

/** Applique le thème : classe .dark sur <html>, couleur de la barre du navigateur. */
export function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && systemQuery().matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#000000' : '#f5f5f7');
}
