import {
  type A2uiIconSet,
  BASIC_ICON_TO_LUCIDE,
  normalizeLucideName,
  normalizeSimpleName,
  parseIconName,
} from './basic';
import { LOBEHUB_NAMES, LUCIDE_NAMES, SIMPLE_NAMES } from './names';

export { type A2uiIconSet, BASIC_ICON_TO_LUCIDE, ICON_SETS, parseIconName } from './basic';

const sets: Record<A2uiIconSet, string> = {
  lobehub: LOBEHUB_NAMES,
  lucide: LUCIDE_NAMES,
  simple: SIMPLE_NAMES,
};
const cache = new Map<A2uiIconSet, Set<string>>();
/** The names in one set, parsed on first use. */
export const iconNames = (set: A2uiIconSet): ReadonlySet<string> => {
  let names = cache.get(set);
  if (!names) cache.set(set, (names = new Set(sets[set].split(' '))));
  return names;
};

/** The name as the set writes it: kebab-case for Lucide, lowercase slugs for Simple Icons. */
export const normalizeIconName = (set: A2uiIconSet, name: string): string => {
  if (set === 'lucide') return normalizeLucideName(name);
  if (set === 'simple') return normalizeSimpleName(name);
  const lower = name.trim().toLowerCase();
  return [...iconNames('lobehub')].find((id) => id.toLowerCase() === lower) ?? name.trim();
};

/** A few names close to `name`, for an error that helps the model pick a real one. */
const suggest = (set: A2uiIconSet, name: string) => {
  const needle = normalizeIconName(set, name).replaceAll('-', '');
  const head = needle.slice(0, 4);
  return [...iconNames(set)]
    .filter((candidate) => {
      const flat = candidate.toLowerCase().replaceAll('-', '');
      return flat.includes(needle) || needle.includes(flat) || (head && flat.startsWith(head));
    })
    .slice(0, 5);
};

/** Why an Icon name can't be drawn, or undefined when it can. */
export const iconError = (value: string): string | undefined => {
  const parsed = parseIconName(value);
  if ('basic' in parsed) {
    if (parsed.basic in BASIC_ICON_TO_LUCIDE) return undefined;
    return `"${value}" is not a basic icon name. Use a basic name, or "lucide:<name>", "simple:<brand>" or "lobehub:<provider>"`;
  }
  const { name, set } = parsed;
  if (iconNames(set).has(normalizeIconName(set, name))) return undefined;
  const close = suggest(set, name).map((candidate) => `${set}:${candidate}`);
  return `No ${set} icon named "${name}"${close.length > 0 ? `. Did you mean: ${close.join(', ')}?` : ''}`;
};
