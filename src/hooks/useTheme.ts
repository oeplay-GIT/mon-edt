import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  loadThemePref,
  saveThemePref,
  systemQuery,
  type ThemePref,
} from '../lib/theme';

/** Gère le thème choisi (clair / sombre / auto), le mémorise et l'applique. */
export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(loadThemePref);

  useEffect(() => {
    applyTheme(pref);
    if (pref !== 'system') return;
    // En mode « Auto », on réagit aux changements du système en direct
    const mq = systemQuery();
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    saveThemePref(p);
    setPrefState(p);
  }, []);

  return { pref, setPref };
}
