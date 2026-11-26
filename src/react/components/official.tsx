import { Markdown } from '@lobehub/ui';
import { Quote as QuoteIcon } from 'lucide-react';

import { a2ui } from './a2ui';
import { A2uiIcon } from './icon';
import { childrenOf, define, safeUrl } from './shared';

/**
 * The official A2UI playground's text and content components (CopilotKit a2ui-playground
 * `content.tsx` / `layout.tsx`, MIT): a Heading whose context follows the title, Section, Title,
 * Caption, Markdown, Quote, Kbd, Link and LinkCard.
 */

const HEADING = {
  '1': { fontSize: 24, lineHeight: 1.25 },
  '2': { fontSize: 19, lineHeight: 1.375 },
  '3': { fontSize: 15.5, lineHeight: 1.375 },
} as const;

export const HeadingView = define('Heading', ({ props }) => {
  const level = String(props.level ?? '2') as keyof typeof HEADING;
  const size = HEADING[level] ?? HEADING['2'];
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div
        style={{
          alignItems: 'baseline',
          columnGap: 10,
          display: 'flex',
          flexWrap: 'wrap',
          minWidth: 0,
          rowGap: 2,
        }}
      >
        <h2 className={a2ui.heading} style={size}>
          {String(props.text ?? '')}
        </h2>
        {props.eyebrow ? <span className={a2ui.label}>{String(props.eyebrow)}</span> : null}
      </div>
      {props.subtitle ? (
        <p className={a2ui.muted} style={{ fontSize: 13, lineHeight: 1.625, margin: 0 }}>
          {String(props.subtitle)}
        </p>
      ) : null}
    </header>
  );
});

export const SectionView = define('Section', ({ props, buildChild }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
    <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          alignItems: 'baseline',
          columnGap: 10,
          display: 'flex',
          flexWrap: 'wrap',
          rowGap: 2,
        }}
      >
        <h3 className={a2ui.heading} style={{ fontSize: 15 }}>
          {String(props.title ?? '')}
        </h3>
        {props.eyebrow ? <span className={a2ui.label}>{String(props.eyebrow)}</span> : null}
      </div>
      {props.description ? (
        <p className={a2ui.muted} style={{ fontSize: 12.5, lineHeight: 1.625, margin: 0 }}>
          {String(props.description)}
        </p>
      ) : null}
    </header>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      {childrenOf(props.children, buildChild)}
    </div>
  </section>
));

const TITLE_SIZE: Record<string, number> = {
  '2xl': 22,
  '3xl': 26,
  '4xl': 30,
  '5xl': 36,
  'lg': 17,
  'md': 15,
  'sm': 13.5,
  'xl': 19,
};

export const TitleView = define('Title', ({ props }) => (
  <div
    className={a2ui.heading}
    style={{
      fontSize: TITLE_SIZE[String(props.size ?? 'md')] ?? 15,
      lineHeight: 1.375,
      textAlign: props.textAlign as never,
    }}
  >
    {String(props.text ?? '')}
  </div>
));

const CAPTION_SIZE: Record<string, number> = { lg: 12.5, md: 12, sm: 11.5 };

export const CaptionView = define('Caption', ({ props }) => (
  <div
    className={a2ui.muted}
    style={{
      fontSize: CAPTION_SIZE[String(props.size ?? 'lg')] ?? 12.5,
      lineHeight: 1.5,
      textAlign: props.textAlign as never,
    }}
  >
    {String(props.text ?? '')}
  </div>
));

export const MarkdownView = define('Markdown', ({ props }) => (
  <Markdown fontSize={13.5} style={{ minWidth: 0, width: 'auto' }} variant="chat">
    {String(props.text ?? '')}
  </Markdown>
));

export const QuoteView = define('Quote', ({ props }) => (
  <figure className={a2ui.quote}>
    <QuoteIcon
      aria-hidden
      size={32}
      style={{
        color: 'color-mix(in srgb, var(--a2-accent) 15%, transparent)',
        insetInlineEnd: 16,
        position: 'absolute',
        top: 12,
      }}
    />
    <blockquote
      style={{
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: '-0.015em',
        lineHeight: 1.625,
        margin: 0,
        textWrap: 'pretty',
      }}
    >
      {String(props.text ?? '')}
    </blockquote>
    {props.author ? (
      <figcaption className={a2ui.muted} style={{ fontSize: 12, marginBlockStart: 12 }}>
        <span style={{ color: 'var(--a2-foreground)', fontWeight: 500 }}>
          {String(props.author)}
        </span>
        {props.role ? <span>, {String(props.role)}</span> : null}
      </figcaption>
    ) : null}
  </figure>
));

export const KbdView = define('Kbd', ({ props }) => {
  const keys = (Array.isArray(props.keys) ? props.keys : []).map(String);
  return (
    <div style={{ alignItems: 'center', display: 'inline-flex', fontSize: 12.5, gap: 8 }}>
      <span style={{ alignItems: 'center', display: 'inline-flex', gap: 4 }}>
        {keys.map((key, index) => (
          // Keys repeat ("Shift + Shift"); their place is their identity.
          // eslint-disable-next-line @eslint-react/no-array-index-key
          <kbd className={a2ui.kbd} key={`${key}-${index}`}>
            {key}
          </kbd>
        ))}
      </span>
      {props.label ? <span className={a2ui.muted}>{String(props.label)}</span> : null}
    </div>
  );
});

const linkable = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const url = value.trim();
  return /^mailto:/i.test(url) ? url : safeUrl(url);
};

export const LinkView = define('Link', ({ props }) => {
  const href = linkable(props.href);
  const text = String(props.text ?? '');
  if (!href) return <span>{text}</span>;
  return (
    <a
      className={a2ui.link}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={props.title ? String(props.title) : undefined}
    >
      {text}
    </a>
  );
});

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export const LinkCardView = define('LinkCard', ({ props }) => {
  const href = safeUrl(props.href);
  if (!href) return null;
  const domain = props.domain ? String(props.domain) : domainOf(href);
  const image = safeUrl(props.image);
  return (
    <a
      className={`${a2ui.card} ${a2ui.linkCard}`}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span
          className={a2ui.muted}
          style={{ alignItems: 'center', display: 'flex', fontSize: 11.5, gap: 6 }}
        >
          <A2uiIcon color="var(--a2-muted)" name="lucide:globe" size={13} />
          {domain}
        </span>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {String(props.title ?? '')}
        </span>
        {props.description ? (
          <span
            className={a2ui.muted}
            style={{
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              display: '-webkit-box',
              fontSize: 12.5,
              lineHeight: 1.5,
              overflow: 'hidden',
            }}
          >
            {String(props.description)}
          </span>
        ) : null}
      </div>
      {image ? (
        <img
          alt=""
          src={image}
          style={{ borderRadius: 8, flex: 'none', height: 56, objectFit: 'cover', width: 72 }}
        />
      ) : null}
    </a>
  );
});
