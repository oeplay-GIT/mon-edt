import { useState, type FormEvent } from 'react';
import type { ThemePref } from '../lib/theme';
import VersionInfo from './VersionInfo'

interface Props {
  initialUrl: string;
  onSave: (url: string) => void;
  theme: ThemePref;
  onThemeChange: (t: ThemePref) => void;
  /** Absent à la toute première utilisation (rien vers quoi revenir). */
  onCancel?: () => void;
}

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Auto' },
];

function isValidUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export default function SettingsScreen({
  initialUrl,
  onSave,
  theme,
  onThemeChange,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialUrl);
  const [touched, setTouched] = useState(false);
  const trimmed = value.trim();
  const invalid = touched && !isValidUrl(trimmed);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (isValidUrl(trimmed)) onSave(trimmed);
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col overflow-x-clip px-6 pb-10 pt-[max(3rem,env(safe-area-inset-top))]">
      <h1 className="text-[32px] font-bold leading-tight tracking-tight">
        {onCancel ? 'Réglages' : 'Bienvenue'}
      </h1>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
        Collez le lien d'export iCalendar (.ics) de votre emploi du temps ADE Campus.
      </p>

      <form onSubmit={submit} className="mt-8">
        <label htmlFor="ics-url" className="text-[13px] font-medium text-ink-soft">
          URL de l'emploi du temps
        </label>
        {/* 16 px minimum : en dessous, iPhone zoome tout seul sur le champ */}
        <textarea
          id="ics-url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={5}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="https://ade-…/jsp/custom/modules/plannings/direct_cal.jsp?…"
          className={`mt-2 w-full resize-none rounded-xl border bg-surface p-3.5 text-[16px] leading-snug text-ink outline-none transition-colors [overflow-wrap:anywhere] focus:border-accent ${
            invalid ? 'border-red-400' : 'border-line'
          }`}
        />
        {invalid && (
          <p className="mt-2 text-[13px] text-red-500">
            Le lien doit être une adresse complète commençant par https://
          </p>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-accent py-3.5 text-[16px] font-semibold text-white active:opacity-80"
        >
          Enregistrer
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 w-full rounded-xl py-3.5 text-[16px] font-medium text-accent active:opacity-60"
          >
            Annuler
          </button>
        )}
      </form>

      {/* Apparence : le changement est immédiat, sans bouton Enregistrer */}
      <section className="mt-10">
        <h2 className="text-[13px] font-medium text-ink-soft">Apparence</h2>
        <div
          role="radiogroup"
          aria-label="Apparence"
          className="mt-2 grid grid-cols-3 rounded-xl bg-line p-1"
        >
          {THEME_OPTIONS.map((o) => {
            const active = theme === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onThemeChange(o.value)}
                className={`rounded-lg py-2 text-[14px] font-medium transition-colors ${
                  active ? 'bg-surface text-ink' : 'text-ink-soft'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </section>

      <p className="mt-10 text-[13px] leading-relaxed text-ink-soft">
        Ce lien est personnel : il est stocké uniquement sur cet appareil et n'est utilisé que pour
        télécharger votre planning.
      </p>
      <VersionInfo />
    </main>
  );
}
