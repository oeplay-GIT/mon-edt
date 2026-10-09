import type { CSSProperties } from 'react';

interface Shades {
  bg: string;   // fond de carte
  bar: string;  // liseré gauche
  text: string; // texte
}

interface Tone {
  light: Shades;
  dark: Shades;
}

/**
 * Palette : chaque matière a une version claire (pastel) et une version sombre
 * (fond très foncé teinté, texte pastel).
 */
const PALETTE: Tone[] = [
  { // bleu
    light: { bg: '#E8F0FE', bar: '#8AB4F8', text: '#1F3A68' },
    dark: { bg: '#14233D', bar: '#5E8FE8', text: '#BBD3FA' },
  },
  { // vert
    light: { bg: '#E6F4EA', bar: '#81C995', text: '#1E4D2B' },
    dark: { bg: '#14291C', bar: '#4FAF6D', text: '#B5E3C2' },
  },
  { // ambre
    light: { bg: '#FEF3E0', bar: '#F6C177', text: '#6B4A12' },
    dark: { bg: '#33250E', bar: '#D9A04A', text: '#F5D9A6' },
  },
  { // rose
    light: { bg: '#FCE8EF', bar: '#F28DB2', text: '#6E2A44' },
    dark: { bg: '#38182A', bar: '#D9628F', text: '#F5BCD3' },
  },
  { // lavande
    light: { bg: '#EFE9FB', bar: '#B39DDB', text: '#3F2B6B' },
    dark: { bg: '#25193F', bar: '#8E72CC', text: '#D5C7F2' },
  },
  { // turquoise
    light: { bg: '#E0F5F3', bar: '#6FCFC4', text: '#14504A' },
    dark: { bg: '#0F2C2A', bar: '#3FAFA3', text: '#A9E6DF' },
  },
  { // corail
    light: { bg: '#FDEBE3', bar: '#F4A582', text: '#6B3318' },
    dark: { bg: '#35190F', bar: '#DB7D52', text: '#F5C5AE' },
  },
  { // citron vert
    light: { bg: '#F1F6DC', bar: '#BCD35F', text: '#43501A' },
    dark: { bg: '#272D10', bar: '#9AB23D', text: '#D9E7A0' },
  },
  { // ciel
    light: { bg: '#E3F3FB', bar: '#7CC4E8', text: '#134A66' },
    dark: { bg: '#0F2B3A', bar: '#4BA6D3', text: '#AEDCF2' },
  },
  { // pierre
    light: { bg: '#EFECE8', bar: '#BDB5A9', text: '#4A443B' },
    dark: { bg: '#272522', bar: '#8F877B', text: '#D6D0C7' },
  },
];

/** Une même matière a toujours la même couleur (hash djb2 de la clé). */
function toneFor(key: string): Tone {
  let h = 5381;
  for (const ch of key) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/**
 * Variables CSS à poser sur un élément portant la classe « tone ».
 * Le CSS (index.css) choisit ensuite la version claire ou sombre.
 */
export function toneVars(key: string): CSSProperties {
  const t = toneFor(key);
  return {
    '--tone-bg': t.light.bg,
    '--tone-bar': t.light.bar,
    '--tone-text': t.light.text,
    '--tone-bg-dark': t.dark.bg,
    '--tone-bar-dark': t.dark.bar,
    '--tone-text-dark': t.dark.text,
  } as CSSProperties;
}
