import { cssVar } from '@lobehub/ui';
import { createElement, useEffect, useState } from 'react';

import { iconNames } from '../../icons';
import { BASIC_ICON_TO_LUCIDE, normalizeLucideName, parseIconName } from '../../icons/basic';
import type { LUCIDE_ICONS } from '../icons/lucide';
import { define } from './shared';

type IconMap = typeof LUCIDE_ICONS;

/**
 * The bundled Lucide icons load as one chunk the first time a card shows an icon: hosts that never
 * draw one don't pay for them, and no icon is fetched from a CDN.
 */
let icons: IconMap | undefined;
let loading: Promise<IconMap> | undefined;
const loadIcons = () =>
  (loading ??= import('../icons/lucide').then((module) => (icons = module.LUCIDE_ICONS)));

const useIcons = () => {
  const [loaded, setLoaded] = useState(icons);
  useEffect(() => {
    if (!loaded) loadIcons().then(setLoaded, () => {});
  }, [loaded]);
  return loaded;
};

/** The kebab-case Lucide name an Icon name stands for, or undefined if it isn't bundled. */
const lucideKey = (name: string) => {
  const parsed = parseIconName(name);
  const key =
    'basic' in parsed
      ? (BASIC_ICON_TO_LUCIDE[parsed.basic] ?? normalizeLucideName(parsed.basic))
      : normalizeLucideName(parsed.name);
  return iconNames().has(key) ? key : undefined;
};

export interface A2uiIconProps {
  /** Overrides the muted text colour icons take by default. */
  color?: string;
  /** A basic Icon name, or `lucide:<name>` (`lucide:rocket`). */
  name: string;
  size?: number;
}

/**
 * One icon from the bundled Lucide set. A name outside the set draws nothing rather than an empty
 * gap; while the set loads, a known name holds its square so the line doesn't shift.
 */
export const A2uiIcon = ({ color, name, size = 18 }: A2uiIconProps) => {
  const loaded = useIcons();
  const key = lucideKey(name);
  if (!key) return null;
  const Icon = loaded?.[key];
  if (!Icon)
    return (
      <span
        aria-hidden
        style={{ display: 'inline-block', flex: 'none', height: size, width: size }}
      />
    );
  // A lookup into a static map, not a component made during render.
  return createElement(Icon, {
    'aria-label': name,
    'role': 'img',
    size,
    'strokeWidth': 1.75,
    'style': { color: color ?? cssVar.colorTextSecondary, flex: 'none' },
  });
};

const SVG_PATH = /^[\d\s+,.ACEHLMQSTVZ-]*$/i;

export const IconView = define('Icon', ({ props }) => {
  const name = props.name;
  if (name && typeof name === 'object' && typeof name.svgPath === 'string')
    return SVG_PATH.test(name.svgPath) ? (
      <svg
        aria-hidden
        fill="currentColor"
        height={18}
        style={{ color: cssVar.colorTextSecondary, flex: 'none' }}
        viewBox="0 0 24 24"
        width={18}
      >
        <path d={name.svgPath} />
      </svg>
    ) : null;
  if (typeof name !== 'string' || !name || !lucideKey(name)) return null;
  return <A2uiIcon name={name} />;
});
