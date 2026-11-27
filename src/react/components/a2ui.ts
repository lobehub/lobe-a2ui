import { createStaticStyles } from '@lobehub/ui';

/**
 * The official A2UI playground's boxed-component look (CopilotKit a2ui-playground `globals.css`,
 * MIT) on LobeHub's own tokens: geometry, type and spacing follow the official surfaces, colours
 * come from `@lobehub/ui`'s theme, so a card agrees with the rest of the app in light and dark.
 */
export const a2ui = createStaticStyles(({ css, cssVar }) => ({
  floor: css`
    --a2-foreground: ${cssVar.colorText};
    --a2-muted: ${cssVar.colorTextSecondary};
    --a2-surface: ${cssVar.colorBgContainer};
    /* The floor is the host's own background, a hair off it (official: page 0.135, floor 0.145 in
       dark; 0.992 and 0.985 in light), so it never reads as a dark well under the chat. */
    --a2-floor: color-mix(in srgb, ${cssVar.colorText} 2.5%, transparent);
    --a2-line: ${cssVar.colorBorderSecondary};
    --a2-line-strong: ${cssVar.colorBorder};
    --a2-radius: 14px;
    --a2-accent: ${cssVar.colorLink};
    --a2-positive: ${cssVar.colorSuccess};
    --a2-negative: ${cssVar.colorError};
    --a2-warning: ${cssVar.colorWarning};
    --a2-info: ${cssVar.colorInfo};
    --a2-tint: color-mix(in srgb, ${cssVar.colorText} 3%, transparent);
    --a2-card-sheen: transparent;
    --a2-card-shadow:
      0 1px 2px color-mix(in srgb, ${cssVar.colorText} 6%, transparent),
      0 1px 3px color-mix(in srgb, ${cssVar.colorText} 4%, transparent);
    --a2-dot: color-mix(in srgb, ${cssVar.colorText} 7%, transparent);

    container: a2ui / inline-size;
    position: relative;

    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--a2-line);
    border-radius: var(--a2-radius);

    font-size: 13.5px;
    line-height: 1.625;
    color: var(--a2-foreground);

    background-color: var(--a2-floor);
    background-image: radial-gradient(circle at 1px 1px, var(--a2-dot) 1px, transparent 0);
    background-position: -1px -1px;
    background-size: 18px 18px;

    /* Dark: an inner top highlight and a faint sheen instead of a drop shadow, as in the official look. */
    :root[data-theme='dark'] & {
      --a2-card-sheen: color-mix(in srgb, ${cssVar.colorText} 2.2%, transparent);
      --a2-card-shadow:
        inset 0 1px 0 color-mix(in srgb, ${cssVar.colorText} 4%, transparent),
        0 1px 2px rgb(0 0 0 / 30%);
      --a2-dot: color-mix(in srgb, ${cssVar.colorText} 5.5%, transparent);
    }
  `,
  // Every boxed component: surface, hairline, 14px corners, a soft shadow (dark: inner highlight).
  card: css`
    min-width: 0;
    border: 1px solid var(--a2-line);
    border-radius: var(--a2-radius);

    background: linear-gradient(180deg, var(--a2-card-sheen), transparent 40%), var(--a2-surface);
    box-shadow: var(--a2-card-shadow);
  `,
  // An inset well inside a card: rows, chips, mini panels.
  well: css`
    border: 1px solid var(--a2-line);
    border-radius: 10px;
    background: var(--a2-tint);
  `,
  // A heading's context: after the title, sentence case, quiet. Never a kicker above it.
  label: css`
    font-size: 12.5px;
    font-weight: 500;
    color: var(--a2-muted);
  `,
  muted: css`
    color: var(--a2-muted);
  `,
  heading: css`
    margin: 0;
    font-weight: 600;
    color: var(--a2-foreground);
    text-wrap: balance;
    letter-spacing: -0.025em;
  `,
  link: css`
    color: var(--a2-accent);
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, var(--a2-accent) 40%, transparent);
    text-underline-offset: 3px;
  `,
  code: css`
    padding-block: 0.1em;
    padding-inline: 0.35em;
    border-radius: 5px;

    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.88em;

    background: color-mix(in srgb, var(--a2-foreground) 7%, transparent);
  `,
  kbd: css`
    min-width: 24px;
    padding-block: 2px;
    padding-inline: 6px;
    border: 1px solid var(--a2-line-strong);
    border-block-end-width: 2px;
    border-radius: 6px;

    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 11px;
    font-weight: 500;
    text-align: center;

    background: color-mix(in srgb, var(--a2-foreground) 6%, transparent);
  `,
  quote: css`
    position: relative;

    overflow: hidden;

    min-width: 0;
    margin: 0;
    padding-block: 16px;
    padding-inline: 20px;
    border: 1px solid var(--a2-line);
    border-radius: var(--a2-radius);

    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--a2-accent) 7%, transparent),
      transparent
    );
  `,
  linkCard: css`
    cursor: pointer;

    display: flex;
    gap: 12px;
    align-items: flex-start;

    padding-block: 12px;
    padding-inline: 14px;

    color: inherit;
    text-decoration: none;

    transition: border-color 150ms ease;

    &:hover {
      border-color: var(--a2-line-strong);
    }

    &:focus-visible {
      outline: 2px solid color-mix(in oklch, var(--a2-accent) 65%, transparent);
      outline-offset: 2px;
    }
  `,
  favicon: css`
    flex: none;
    width: 16px;
    height: 16px;
    margin-block-start: 2px;
    border-radius: 4px;
  `,
  pressable: css`
    cursor: pointer;
    transition: border-color 150ms ease;

    &:hover {
      border-color: var(--a2-line-strong);
    }

    &:focus-visible {
      outline: 2px solid color-mix(in oklch, var(--a2-accent) 65%, transparent);
      outline-offset: 2px;
    }
  `,
}));
