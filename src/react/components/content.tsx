import {
  Descriptions,
  Flexbox,
  Highlighter,
  Image,
  Markdown,
  Steps,
  Table,
  Tag,
  Text,
  Video,
} from '@lobehub/ui';
import { MetricStrip, StatCard } from '@lobehub/ui/dashboard';
import { type ReactNode } from 'react';

import { A2UI_LIST_LIMITS } from '../../constants';
import { useA2uiLabels } from '../host';
import { A2uiIcon } from './icon';
import { cell, define, rowsOf, safeUrl, styles } from './shared';

// --- Basic catalog ---------------------------------------------------------------------------

const HEADING = /^(#{1,6})\s+(\S[^\n]*)$/;
const HEADING_SIZE = [24, 20, 18, 16, 14, 14];

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https:\/\/[^\s)]+\))/g;
const LINK = /^\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)$/;

/** A caption's inline Markdown: `code`, **bold** and https [links](https://…); anything else stays as written. */
const inline = (text: string): ReactNode[] => {
  let at = 0;
  return text.split(INLINE).map((part) => {
    // Keyed by where the part starts in the text: stable, and unique even when parts repeat.
    const key = at;
    at += part.length;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`'))
      return (
        <code className={styles.code} key={key}>
          {part.slice(1, -1)}
        </code>
      );
    const link = LINK.exec(part);
    if (link)
      return (
        <a
          className={styles.link}
          href={link[2]}
          key={key}
          rel="noopener noreferrer"
          target="_blank"
        >
          {link[1]}
        </a>
      );
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**'))
      return (
        <Text as="strong" fontSize={12} key={key} weight={500}>
          {part.slice(2, -2)}
        </Text>
      );
    return part;
  });
};

/** Markdown text; a one-line heading draws as a heading, a caption smaller and muted. */
export const TextView = define('Text', ({ props }) => {
  const text = String(props.text ?? '');
  const heading = HEADING.exec(text.trim());
  if (heading)
    return (
      <Text as="div" fontSize={HEADING_SIZE[heading[1].length - 1]} weight={600}>
        {heading[2]}
      </Text>
    );
  if (props.variant === 'caption')
    return (
      <Text as="div" fontSize={12} style={{ lineHeight: 1.6 }} type="secondary">
        {inline(text)}
      </Text>
    );
  // Auto width: stretched in a Column, its own width in a Row.
  return (
    <Markdown fontSize={14} style={{ minWidth: 0, width: 'auto' }} variant="chat">
      {text}
    </Markdown>
  );
});

const IMAGE_SIZE: Record<
  string,
  { height?: number | string; radius?: number | string; width?: number | string }
> = {
  avatar: { height: 40, radius: '50%', width: 40 },
  header: { height: 200, radius: 8, width: '100%' },
  icon: { height: 24, radius: 4, width: 24 },
  largeFeature: { height: 'auto', radius: 8, width: '100%' },
  mediumFeature: { height: 'auto', radius: 8, width: '100%' },
  smallFeature: { height: 100, radius: 8, width: 100 },
};
const FIT: Record<string, string> = {
  contain: 'contain',
  cover: 'cover',
  fill: 'fill',
  none: 'none',
  scaleDown: 'scale-down',
};

export const ImageView = define('Image', ({ props }) => {
  const url = safeUrl(props.url);
  if (!url) return null;
  const variant = (props.variant ?? 'mediumFeature') as string;
  const size = IMAGE_SIZE[variant] ?? IMAGE_SIZE.mediumFeature;
  const fit = FIT[props.fit ?? (variant === 'header' || variant === 'avatar' ? 'cover' : 'fill')];
  const fixed = typeof size.width === 'number';
  const maxHeight =
    variant === 'largeFeature' ? 400 : variant === 'mediumFeature' ? 300 : size.height;
  return (
    <Image
      alt={String(props.description ?? '')}
      preview={!fixed && variant !== 'header'}
      src={url}
      style={{ maxWidth: '100%', width: size.width }}
      variant="borderless"
      width={size.width}
      styles={{
        image: {
          borderRadius: size.radius,
          height: size.height === 'auto' ? 'auto' : '100%',
          maxHeight,
          objectFit: fit as never,
          width: '100%',
        },
        wrapper: {
          borderRadius: size.radius,
          flex: 'none',
          height: size.height === 'auto' ? undefined : size.height,
          maxWidth: '100%',
          overflow: 'hidden',
          width: size.width,
        },
      }}
    />
  );
});

export const VideoView = define('Video', ({ props }) => {
  const url = safeUrl(props.url);
  if (!url) return null;
  return <Video poster={safeUrl(props.posterUrl)} src={url} width="100%" />;
});

export const AudioPlayerView = define('AudioPlayer', ({ props }) => {
  const url = safeUrl(props.url);
  if (!url) return null;
  return (
    <Flexbox gap={6} style={{ width: '100%' }}>
      {props.description ? (
        <Text fontSize={13} type="secondary">
          {String(props.description)}
        </Text>
      ) : null}
      <audio controls preload="metadata" src={url} style={{ width: '100%' }} />
    </Flexbox>
  );
});

// --- Retired 1.x LobeHub components ----------------------------------------------------------
// Kept so stored cards replay, drawn in the same a2ui look as their replacements.

type MetricInput = { delta?: string; direction?: 'down' | 'flat' | 'up'; hint?: string; label: string; tone?: string; value: string };

export const MetricsView = define('Metrics', ({ props }) => (
  <MetricStrip
    variant="a2ui"
    items={rowsOf<MetricInput>(props.items, A2UI_LIST_LIMITS.Metrics.items).map((item) => ({
      delta: item.delta,
      direction: item.direction,
      hint: item.hint,
      label: item.label,
      value: item.value,
      valueTone: item.tone === 'bad' ? 'danger' : item.tone === 'warn' ? 'warning' : undefined,
    }))}
  />
));

type TableColumnInput = { align?: 'center' | 'end' | 'start'; key: string; label?: string };

export const TableView = define('Table', ({ props }) => {
  const columns = rowsOf<TableColumnInput>(props.columns, 8).filter(
    (column) => typeof column.key === 'string',
  );
  const rows = rowsOf<Record<string, unknown>>(props.rows, A2UI_LIST_LIMITS.Table.rows);
  const labels = useA2uiLabels();
  const title = props.title ? String(props.title) : undefined;
  if (columns.length === 0) return null;
  return (
    <Table
      dataSource={rows}
      locale={{ emptyText: labels.empty }}
      pagination={false}
      rowKey={(_, index) => String(index)}
      title={title ? () => title : undefined}
      variant="a2ui"
      columns={columns.map((column) => ({
        align: column.align === 'end' ? 'right' : column.align === 'center' ? 'center' : undefined,
        dataIndex: column.key,
        key: column.key,
        render: (value: unknown) => cell(value),
        title: column.label ?? column.key,
      }))}
    />
  );
});

export const KeyValueView = define('KeyValue', ({ props }) => (
  <Descriptions
    column={props.columns ?? 1}
    title={props.title ? String(props.title) : undefined}
    variant="a2ui"
    items={rowsOf<{ label?: unknown; value?: unknown }>(props.items, A2UI_LIST_LIMITS.KeyValue.items).map(
      (item, index) => ({ children: cell(item.value), key: index, label: cell(item.label) }),
    )}
  />
));

const STEP_STATUS: Record<string, 'error' | 'finish' | 'process' | 'wait'> = {
  current: 'process',
  done: 'finish',
  error: 'error',
  todo: 'wait',
};

type StepInput = { detail?: unknown; meta?: unknown; status?: string; title?: unknown };

export const StepsView = define('Steps', ({ props }) => (
  <Steps
    orientation="vertical"
    variant="a2ui"
    items={rowsOf<StepInput>(props.items, A2UI_LIST_LIMITS.Steps.items).map((item, index) => ({
      description: item.detail ? cell(item.detail) : undefined,
      key: index,
      status: STEP_STATUS[item.status as string] ?? 'wait',
      time: item.meta ? cell(item.meta) : undefined,
      title: cell(item.title),
    }))}
  />
));

export const StatisticView = define('Statistic', ({ props }) => (
  <StatCard
    hint={props.caption ? String(props.caption) : undefined}
    label={String(props.label ?? '')}
    value={`${props.prefix ? String(props.prefix) : ''}${String(props.value ?? '')}${props.suffix ? ` ${String(props.suffix)}` : ''}`}
    valueTone={props.tone === 'error' ? 'danger' : props.tone === 'warning' ? 'warning' : undefined}
    variant="a2ui"
  />
));

export const TagView = define('Tag', ({ props }) => (
  <span style={{ display: 'inline-flex' }}>
    <Tag
      color={props.color === 'default' ? undefined : props.color}
      icon={props.icon ? <A2uiIcon color="currentColor" name={String(props.icon)} size={12} /> : undefined}
      variant="a2ui"
    >
      {String(props.text ?? '')}
    </Tag>
  </span>
));

export const CodeView = define('Code', ({ props }) => (
  <Highlighter copyable language={String(props.language ?? 'txt')} variant="a2ui">
    {String(props.code ?? '')}
  </Highlighter>
));
