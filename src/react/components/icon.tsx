import { genCdnUrl, useCdnFn } from '@lobehub/ui';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  BASIC_ICON_TO_LUCIDE,
  normalizeLucideName,
  normalizeSimpleName,
  parseIconName,
} from '../../icons/basic';
import { ICON_PACKAGES } from '../../icons/packages';
import { define } from './shared';

type IconSet = 'lobehub' | 'lucide' | 'simple';

/**
 * Icons are fetched from the host's CDN as plain SVG (`ICON_PACKAGES`), so no icon is bundled: the
 * renderer adds no chunk per icon, and a card downloads only the icons it shows.
 */
const PACKAGES = ICON_PACKAGES;

const fileOf = (set: IconSet, name: string) =>
  // LobeHub ids are PascalCase ('OpenAI'); their files are lowercase ('openai.svg').
  set === 'lobehub' ? name.trim().toLowerCase() : name;

type CdnFn = ReturnType<typeof useCdnFn>;

const iconUrl = (cdn: CdnFn | undefined, set: IconSet, file: string) => {
  const api = { ...PACKAGES[set], path: `icons/${file}.svg` };
  return cdn ? cdn(api) : genCdnUrl(api);
};

/** A single-colour icon that takes the text colour, as the basic catalog's guide asks. */
const MaskIcon = ({ label, size, url }: { label: string; size: number; url: string }) => {
  const mask = `url("${url}") center / contain no-repeat`;
  const style: CSSProperties = {
    WebkitMask: mask,
    backgroundColor: 'currentColor',
    display: 'inline-block',
    flex: 'none',
    height: size,
    mask,
    width: size,
  };
  return <span aria-label={label} role="img" style={style} />;
};

export interface A2uiIconProps {
  /** A basic Icon name, or `<set>:<name>` (`lucide:rocket`, `simple:github`, `lobehub:OpenAI`). */
  name: string;
  size?: number;
}

/**
 * One icon, drawn from its SVG on the CDN. Lucide and Simple Icons inherit the text colour; a
 * LobeHub brand icon shows its colour version when there is one, else the single-colour one.
 */
export const A2uiIcon = ({ name, size = 24 }: A2uiIconProps) => {
  const cdn = useCdnFn() as CdnFn | undefined;
  const [colorFailed, setColorFailed] = useState(false);
  const parsed = parseIconName(name);
  const set: IconSet = 'basic' in parsed ? 'lucide' : parsed.set;
  const resolved =
    'basic' in parsed
      ? (BASIC_ICON_TO_LUCIDE[parsed.basic] ?? parsed.basic)
      : set === 'simple'
        ? normalizeSimpleName(parsed.name)
        : set === 'lucide'
          ? normalizeLucideName(parsed.name)
          : parsed.name;
  const file = fileOf(set, resolved);
  if (set === 'lobehub' && !colorFailed)
    return (
      <img
        alt={name}
        height={size}
        src={iconUrl(cdn, set, `${file}-color`)}
        style={{ flex: 'none' }}
        width={size}
        onError={() => setColorFailed(true)}
      />
    );
  return <MaskIcon label={name} size={size} url={iconUrl(cdn, set, file)} />;
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
