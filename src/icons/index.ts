import {
  type A2uiIconSet,
  BASIC_ICON_TO_LUCIDE,
  normalizeLucideName,
  parseIconName,
} from './basic';
import { LUCIDE_NAMES } from './names';

export { type A2uiIconSet, BASIC_ICON_TO_LUCIDE, ICON_SETS, parseIconName } from './basic';
export { LUCIDE_NAMES } from './names';

let lucide: Set<string> | undefined;
/** The names in one set, parsed on first use. */
export const iconNames = (_set: A2uiIconSet = 'lucide'): ReadonlySet<string> =>
  (lucide ??= new Set(LUCIDE_NAMES.split(' ')));

/** The name as the set writes it: kebab-case for Lucide. */
export const normalizeIconName = (_set: A2uiIconSet, name: string): string =>
  normalizeLucideName(name);

/** A few names close to `name`, for an error that helps the model pick a real one. */
const suggest = (name: string) => {
  const needle = normalizeLucideName(name).replaceAll('-', '');
  const head = needle.slice(0, 4);
  return [...iconNames()]
    .filter((candidate) => {
      const flat = candidate.replaceAll('-', '');
      return flat.includes(needle) || needle.includes(flat) || (head && flat.startsWith(head));
    })
    .slice(0, 5);
};

/** Why an Icon name can't be drawn, or undefined when it can. */
export const iconError = (value: string): string | undefined => {
  const parsed = parseIconName(value);
  if ('basic' in parsed) {
    if (parsed.basic in BASIC_ICON_TO_LUCIDE) return undefined;
    if (/^\w+:/.test(parsed.basic))
      return `"${value}": brand icons are not available. Use a basic name or "lucide:<name>"`;
    return `"${value}" is not a basic icon name. Use a basic name or "lucide:<name>"`;
  }
  const { name } = parsed;
  if (iconNames().has(normalizeLucideName(name))) return undefined;
  const close = suggest(name).map((candidate) => `lucide:${candidate}`);
  return `No lucide icon named "${name}" in the card set${close.length > 0 ? `. Did you mean: ${close.join(', ')}?` : ''}`;
};
