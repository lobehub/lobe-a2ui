import { createComponentImplementation } from '@a2ui/react';
import { createStaticStyles, cssVar, Text } from '@lobehub/ui';
import { createContext, type ReactNode, use } from 'react';

import { componentApi } from '../../schemaCatalog';
import { isHttpsUrl } from '../../url';

/**
 * How deep in cards a component sits: 0 outside any card, 1 on the surface's own card, 2+ inside a
 * nested Card. Nested cards draw as quiet filled tiles with tighter spacing, not another border.
 */
export const CardDepthContext = createContext(0);
export const useCardDepth = () => use(CardDepthContext);

export type BuildChild = (id: string, basePath?: string) => ReactNode;
type ChildRef = string | { basePath: string; id: string };

/** What a component's renderer receives: its resolved props and a way to draw its children. */
export interface RenderArgs {
  accessibilityRef?: (element: HTMLElement | null) => void;
  buildChild: BuildChild;
  props: Record<string, any>;
}

/**
 * A renderer for one catalog component, bound to the API web_core derives from the catalog's
 * JSON Schema. Two things apply to every component here: `weight` (flex-grow inside a Row or
 * Column), and the `accessibility` label and description, which web_core sets on the element it
 * is handed. A box without its own layout (`display: contents`) carries them otherwise.
 */
export const define = (name: string, Render: (args: RenderArgs) => ReactNode) =>
  createComponentImplementation(
    componentApi(name) as never,
    ((args: RenderArgs) => {
      const node = Render(args);
      if (node === null) return null;
      const weight = args.props.weight;
      return (
        <div
          ref={args.accessibilityRef}
          style={
            typeof weight === 'number' ? { flex: weight, minWidth: 0 } : { display: 'contents' }
          }
        >
          {node}
        </div>
      );
    }) as never,
  );

/** Children of a static list or a data template, in order. */
export const childrenOf = (list: unknown, buildChild: BuildChild) =>
  (Array.isArray(list) ? (list as ChildRef[]) : []).map((ref) =>
    typeof ref === 'string' ? buildChild(ref) : buildChild(ref.id, ref.basePath),
  );

export const JUSTIFY = {
  center: 'center',
  end: 'flex-end',
  spaceAround: 'space-around',
  spaceBetween: 'space-between',
  spaceEvenly: 'space-evenly',
  start: 'flex-start',
  stretch: 'stretch',
} as const;
export const ALIGN = {
  center: 'center',
  end: 'flex-end',
  start: 'flex-start',
  stretch: 'stretch',
} as const;

export const TONE = {
  bad: cssVar.colorError,
  good: cssVar.colorSuccess,
  neutral: cssVar.colorTextSecondary,
  warn: cssVar.colorWarning,
} as const;
export type Tone = keyof typeof TONE;

/** Rows of a bound or literal list, cut to `max` in case bound data grew after validation. */
export const rowsOf = <T,>(value: unknown, max: number) =>
  (Array.isArray(value) ? (value as unknown[]) : [])
    .filter((row): row is T => typeof row === 'object' && row !== null)
    .slice(0, max);

export const cell = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** Bound media is checked again here: validation only sees data present when it ran. */
export const safeUrl = (value: unknown) => (isHttpsUrl(value) ? value.trim() : undefined);

/** A component's own heading, for the components that carry one. */
export const Heading = ({ children }: { children?: unknown }) =>
  children ? <Text weight={600}>{String(children)}</Text> : null;

export const styles = createStaticStyles(({ css, cssVar: token }) => ({
  bar: css`
    flex: 1;
    min-height: 3px;
    border-radius: 2px;
  `,
  bars: css`
    height: 64px;
  `,
  figure: css`
    font-variant-numeric: tabular-nums;
  `,
  hList: css`
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    & > * {
      flex: none;
      max-width: 280px;
    }
  `,
  // A nested Card: a filled tile, so cards in a card read as groups, not boxes in a box.
  tile: css`
    min-width: 0;
    padding-block: 12px;
    padding-inline: 14px;
    border-radius: ${token.borderRadiusLG};
    background: ${token.colorFillTertiary};
  `,
  cardBody: css`
    padding: 16px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(var(--a2-columns), minmax(0, 1fr));
    gap: 12px;
    min-width: 0;

    &[data-columns='1'] {
      --a2-columns: 1;
    }

    &[data-columns='2'] {
      --a2-columns: 2;
    }

    &[data-columns='3'] {
      --a2-columns: 3;
    }

    &[data-columns='4'] {
      --a2-columns: 4;
    }

    @container a2ui (max-width: 520px) {
      &[data-columns='4'] {
        --a2-columns: 2;
      }
    }

    @container a2ui (max-width: 400px) {
      &[data-columns='3'] {
        --a2-columns: 2;
      }
    }

    @container a2ui (max-width: 260px) {
      --a2-columns: 1 !important;
    }
  `,
  clickable: css`
    cursor: pointer;
    position: relative;
    border-radius: ${token.borderRadiusLG};
    transition: background 150ms ${token.motionEaseOut};

    &:hover {
      background: ${token.colorFillSecondary};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimaryBorder};
      outline-offset: 2px;
    }
  `,
  eyebrow: css`
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
    color: ${token.colorTextTertiary};
    letter-spacing: 0.02em;
  `,
  section: css`
    & + & {
      padding-block-start: 4px;
    }
  `,
  star: css`
    position: relative;
    display: inline-flex;
  `,
  starHalf: css`
    position: absolute;
    inset: 0;
  `,
  stack: css`
    & > * + * {
      margin-inline-start: -6px;
    }
  `,
  // One face in an AvatarGroup: a 28px circle with a picture or two initials.
  face: css`
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;

    width: 28px;
    height: 28px;
    border-radius: 50%;

    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    object-fit: cover;
  `,
  more: css`
    width: auto;
    min-width: 28px;
    padding-inline: 6px;
    border-radius: 14px;

    font-weight: 500;
    color: ${token.colorTextSecondary};

    background: ${token.colorFillSecondary};
  `,
  matrixScroll: css`
    overflow-x: auto;
    min-width: 0;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG};
  `,
  matrix: css`
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;

    th,
    td {
      padding-block: 8px;
      padding-inline: 12px;
      text-align: center;
      white-space: nowrap;
    }

    thead th {
      font-weight: 600;
      vertical-align: bottom;
    }

    tbody th {
      font-weight: 400;
      color: ${token.colorTextSecondary};
      text-align: start;
    }

    tbody tr {
      border-block-start: 1px solid ${token.colorBorderSecondary};
    }

    td svg {
      vertical-align: middle;
    }
  `,
  matrixPick: css`
    background: ${token.colorFillTertiary};
  `,
  matrixNote: css`
    display: block;

    margin-block-end: 2px;

    font-size: 11px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,
  linkCard: css`
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;

    min-width: 0;
    padding-block: 12px;
    padding-inline: 14px;
    border-radius: ${token.borderRadiusLG};

    color: inherit;
    text-decoration: none;

    background: ${token.colorFillTertiary};

    transition: background 150ms ${token.motionEaseOut};

    &:hover {
      background: ${token.colorFillSecondary};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimaryBorder};
      outline-offset: 2px;
    }
  `,
  empty: css`
    padding-block: 20px;
    padding-inline: 16px;
    border: 1px dashed ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG};
  `,
  link: css`
    color: inherit;
    text-decoration: underline;
    text-decoration-color: ${token.colorBorder};
    text-underline-offset: 2px;

    &:hover {
      color: ${token.colorText};
      text-decoration-color: currentColor;
    }
  `,
  code: css`
    padding-block: 1px;
    padding-inline: 4px;
    border-radius: 4px;

    font-family: ${token.fontFamilyCode};
    font-size: 0.92em;

    background: ${token.colorFillSecondary};
  `,
  item: css`
    padding-block: 8px;
    padding-inline: 12px;

    & + & {
      border-block-start: 1px solid ${token.colorBorderSecondary};
    }
  `,
  items: css`
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius};
  `,
  status: css`
    flex: none;
    width: 52px;
    padding-block-start: 2px;
  `,
  // Surface bleeds a table to the card edges; in a composed card it keeps the body's padding.
  table: css`
    min-width: 0;

    .lobe-table-wrapper {
      --surface-pad-inline: 0px;
      --surface-pad-block: 0px;
    }

    [data-table-wrapper] {
      --surface-pad-inline: 12px;
    }
  `,
  trigger: css`
    cursor: pointer;
    display: inline-flex;
  `,
  vDivider: css`
    align-self: stretch;
    width: 1px;
    min-height: 16px;
    background: ${token.colorBorderSecondary};
  `,
}));
