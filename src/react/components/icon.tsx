import type { ComponentType, CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import {
  BASIC_ICON_TO_LUCIDE,
  normalizeLucideName,
  normalizeSimpleName,
  parseIconName,
} from '../../icons/basic';
import type { IconLoader } from '../icons/types';
import { define } from './shared';

type IconSet = 'lobehub' | 'lucide' | 'simple';

/**
 * Each set's name → loader table is itself a lazy chunk, and each icon another, so the renderer's
 * main chunk carries no icon at all and a card downloads only the icons it shows.
 */
const TABLES: Record<IconSet, () => Promise<Record<string, IconLoader>>> = {
  lobehub: () => import('../icons/lobehubLoaders').then((m) => m.default),
  lucide: () =>
    import('lucide-react/dynamicIconImports').then(
      (m) => m.default as unknown as Record<string, IconLoader>,
    ),
  simple: () => import('../icons/simpleLoaders').then((m) => m.default),
};

const loaded = new Map<string, ComponentType<any> | null>();

const loadIcon = async (set: IconSet, name: string) => {
  const key = `${set}:${name}`;
  if (loaded.has(key)) return loaded.get(key)!;
  const table = await TABLES[set]();
  // LobeHub ids are PascalCase ('OpenAI'); a model may write them in any case.
  const loader =
    table[name] ??
    (set === 'lobehub'
      ? Object.entries(table).find(([id]) => id.toLowerCase() === name.toLowerCase())?.[1]
      : undefined);
  const icon = loader ? ((await loader()).default ?? null) : null;
  loaded.set(key, icon);
  return icon;
};

const useIcon = (set: IconSet, name: string) => {
  const key = `${set}:${name}`;
  const [icon, setIcon] = useState(() => loaded.get(key));
  useEffect(() => {
    let live = true;
    if (!loaded.has(key))
      loadIcon(set, name)
        .then((next) => live && setIcon(() => next))
        .catch(() => live && setIcon(null));
    else setIcon(() => loaded.get(key));
    return () => {
      live = false;
    };
  }, [key, set, name]);
  return icon;
};

export interface A2uiIconProps {
  /** A basic Icon name, or `<set>:<name>` (`lucide:rocket`, `simple:github`, `lobehub:OpenAI`). */
  name: string;
  size?: number;
}

/**
 * One icon, drawn once its chunk arrives; a box holds its place. It inherits the text colour, as
 * the basic catalog's guide asks, so it reads on any background.
 */
export const A2uiIcon = ({ name, size = 24 }: A2uiIconProps) => {
  const parsed = parseIconName(name);
  const set: IconSet = 'basic' in parsed ? 'lucide' : parsed.set;
  const resolved =
    'basic' in parsed
      ? (BASIC_ICON_TO_LUCIDE[parsed.basic] ?? parsed.basic)
      : set === 'simple'
        ? normalizeSimpleName(parsed.name)
        : set === 'lucide'
          ? normalizeLucideName(parsed.name)
          : parsed.name.trim();
  const Icon = useIcon(set, resolved);
  const style: CSSProperties = { flex: 'none', height: size, width: size };
  if (!Icon) return <span aria-hidden style={{ ...style, display: 'inline-block' }} />;
  if (set === 'simple')
    return <Icon aria-label={name} color="currentColor" size={size} style={style} />;
  return <Icon aria-label={name} size={size} style={style} />;
};

const SVG_PATH = /^[\d\s+,.ACEHLMQSTVZ-]*$/i;

export const IconView = define('Icon', ({ props }) => {
  const name = props.name;
  if (name && typeof name === 'object' && typeof name.svgPath === 'string')
    return SVG_PATH.test(name.svgPath) ? (
      <svg
        aria-hidden
        fill="currentColor"
        height={24}
        style={{ flex: 'none' }}
        viewBox="0 0 24 24"
        width={24}
      >
        <path d={name.svgPath} />
      </svg>
    ) : null;
  if (typeof name !== 'string' || !name) return null;
  return <A2uiIcon name={name} />;
});
