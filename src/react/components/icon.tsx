import { cssVar } from '@lobehub/ui';
import type { ComponentType, CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { BASIC_ICON_TO_LUCIDE, normalizeLucideName, normalizeSimpleName } from '../../icons/basic';
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

const COLORS: Record<string, string | undefined> = {
  default: undefined,
  error: cssVar.colorError,
  primary: cssVar.colorPrimary,
  secondary: cssVar.colorTextSecondary,
  success: cssVar.colorSuccess,
  warning: cssVar.colorWarning,
};

export interface A2uiIconProps {
  color?: string;
  name: string;
  set?: IconSet;
  size?: number;
  variant?: 'avatar' | 'color' | 'mono';
}

/** One icon from the basic names or a set, drawn once its chunk arrives; a box holds its place. */
export const A2uiIcon = ({ name, set, size = 20, color, variant }: A2uiIconProps) => {
  const resolvedSet: IconSet = set ?? 'lucide';
  const resolvedName =
    set === 'simple'
      ? normalizeSimpleName(name)
      : set === 'lobehub'
        ? name.trim()
        : set === 'lucide'
          ? normalizeLucideName(name)
          : (BASIC_ICON_TO_LUCIDE[name] ?? name);
  const Icon = useIcon(resolvedSet, resolvedName);
  const style: CSSProperties = {
    color: color === 'brand' ? undefined : COLORS[color ?? 'default'],
    flex: 'none',
    height: size,
    width: size,
  };
  if (!Icon) return <span aria-hidden style={{ ...style, display: 'inline-block' }} />;

  if (resolvedSet === 'lobehub') {
    const Compound = Icon as ComponentType<any> & Record<string, ComponentType<any>>;
    const Variant =
      variant === 'avatar'
        ? Compound.Avatar
        : variant === 'color' || color === 'brand'
          ? (Compound.Color ?? Compound)
          : Compound;
    return <Variant aria-label={name} size={size} style={style} />;
  }
  if (resolvedSet === 'simple')
    return (
      <Icon
        aria-label={name}
        color={color === 'brand' ? 'default' : 'currentColor'}
        size={size}
        style={style}
      />
    );
  return <Icon aria-label={name} size={size} strokeWidth={2} style={style} />;
};

const SvgPathIcon = ({
  path,
  size = 20,
  color,
}: {
  color?: string;
  path: string;
  size?: number;
}) => (
  <svg
    aria-hidden
    fill="currentColor"
    height={size}
    style={{ color: COLORS[color ?? 'default'], flex: 'none' }}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d={path} />
  </svg>
);

const SVG_PATH = /^[\d\s+,.ACEHLMQSTVZ-]*$/i;

export const IconView = define('Icon', ({ props }) => {
  const name = props.name;
  if (name && typeof name === 'object' && typeof name.svgPath === 'string')
    return SVG_PATH.test(name.svgPath) ? (
      <SvgPathIcon color={props.color} path={name.svgPath} size={props.size} />
    ) : null;
  if (typeof name !== 'string' || !name) return null;
  return (
    <A2uiIcon
      color={props.color}
      name={name}
      set={props.set}
      size={props.size}
      variant={props.variant}
    />
  );
});
