import {
  Alert,
  Avatar,
  cssVar,
  Descriptions,
  Flexbox,
  Highlighter,
  Image,
  Markdown,
  Progress,
  Steps,
  Table,
  Tag,
  Text,
  Video,
} from '@lobehub/ui';
import { type MetricItem, MetricStrip } from '@lobehub/ui/dashboard';
import { type ReactNode, useEffect, useState } from 'react';

import { A2UI_LIST_LIMITS } from '../../constants';
import { useA2uiLabels } from '../host';
import { metricColumns } from '../metricLayout';
import { A2uiIcon } from './icon';
import { cell, define, Heading, rowsOf, safeUrl, styles, TONE, type Tone } from './shared';

/** Semantic colours of the extensions' `tone` / `color`. */
const COLOR: Record<string, string | undefined> = {
  default: undefined,
  error: cssVar.colorError,
  info: cssVar.colorInfo,
  success: cssVar.colorSuccess,
  warning: cssVar.colorWarning,
};

const STEP_STATUSES = ['current', 'done', 'error', 'todo'] as const;

// --- Basic catalog ---------------------------------------------------------------------------

const HEADING = /^(#{1,6})\s+(\S[^\n]*)$/;
const HEADING_SIZE = [24, 20, 18, 16, 14, 14];

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;

/** A caption's inline Markdown: `code` and **bold**; anything else stays as written. */
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

// --- LobeHub extensions ---------------------------------------------------------------------

type MetricInput = {
  delta?: string;
  direction?: MetricItem['direction'];
  hint?: string;
  label: string;
  tone?: Tone;
  value: string;
};

/** The element's content width, kept current as the card resizes. */
const useElementWidth = (element: HTMLElement | null) => {
  const [width, setWidth] = useState<number>();
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return width;
};

export const MetricsView = define('Metrics', ({ props }) => {
  const [strip, setStrip] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(strip);
  const items = rowsOf<MetricInput>(props.items, A2UI_LIST_LIMITS.Metrics.items);
  // Peers share one row while each cell stays readable, then wrap into balanced rows.
  return (
    <div ref={setStrip} style={{ minWidth: 0 }}>
      <MetricStrip
        columns={metricColumns(items.length, width)}
        size="small"
        variant={props.variant ?? 'joined'}
        items={items.map((item) => ({
          delta: item.delta ? (
            <span style={{ color: TONE[item.tone ?? 'neutral'] }} title={item.delta}>
              {item.delta}
            </span>
          ) : undefined,
          direction: item.direction,
          hint: item.hint,
          label: item.label,
          // Good news is green; bad and warn take the strip's own tones.
          value:
            item.tone === 'good' ? (
              <span style={{ color: TONE.good }}>{item.value}</span>
            ) : (
              item.value
            ),
          valueTone: item.tone === 'bad' ? 'danger' : item.tone === 'warn' ? 'warning' : undefined,
        }))}
      />
    </div>
  );
});

type TableColumnInput = { align?: 'center' | 'end' | 'start'; key: string; label?: string };

export const TableView = define('Table', ({ props }) => {
  const columns = rowsOf<TableColumnInput>(props.columns, 8).filter(
    (column) => typeof column.key === 'string',
  );
  const rows = rowsOf<Record<string, unknown>>(props.rows, A2UI_LIST_LIMITS.Table.rows);
  const labels = useA2uiLabels();
  if (columns.length === 0) return null;
  return (
    <Flexbox className={styles.table} gap={8}>
      <Heading>{props.title}</Heading>
      <Table
        dataSource={rows}
        locale={{ emptyText: labels.empty }}
        pagination={false}
        rowHoverable={false}
        rowKey={(_, index) => String(index)}
        scroll={{ x: true }}
        size="small"
        variant="outlined"
        columns={columns.map((column) => ({
          align: column.align ?? 'start',
          dataIndex: column.key,
          key: column.key,
          render: (value: unknown) => (
            <span className={column.align === 'end' ? styles.figure : undefined}>
              {cell(value)}
            </span>
          ),
          title: column.label ?? column.key,
        }))}
      />
      {props.caption ? (
        <Text fontSize={12} type="secondary">
          {String(props.caption)}
        </Text>
      ) : null}
    </Flexbox>
  );
});

export const KeyValueView = define('KeyValue', ({ props }) => {
  const items = rowsOf<{ label?: unknown; value?: unknown }>(
    props.items,
    A2UI_LIST_LIMITS.KeyValue.items,
  );
  return (
    <Descriptions
      colon={false}
      column={props.columns ?? 2}
      title={props.title ? String(props.title) : undefined}
      items={items.map((item, index) => ({
        children: (
          <Markdown fontSize={13} variant="chat">
            {cell(item.value)}
          </Markdown>
        ),
        key: index,
        label: cell(item.label),
      }))}
    />
  );
});

export const ProgressView = define('Progress', ({ props }) => {
  const max = Number(props.max ?? 100) || 100;
  const percent = Math.max(0, Math.min(100, Math.round((Number(props.value ?? 0) / max) * 100)));
  const color = COLOR[props.tone as string];
  const caption = props.caption ? String(props.caption) : `${percent}%`;
  if (props.variant === 'circle')
    return (
      <Flexbox horizontal align="center" gap={10}>
        <Progress percent={percent} size="middle" strokeColor={color} type="circle" />
        <Flexbox gap={2}>
          <Text weight={500}>{String(props.label ?? '')}</Text>
          <Text className={styles.figure} fontSize={12} type="secondary">
            {caption}
          </Text>
        </Flexbox>
      </Flexbox>
    );
  return (
    <Flexbox gap={6} style={{ minWidth: 0, width: '100%' }}>
      <Flexbox horizontal align="baseline" gap={8} justify="space-between">
        <Text weight={500}>{String(props.label ?? '')}</Text>
        <Text className={styles.figure} fontSize={12} type="secondary">
          {caption}
        </Text>
      </Flexbox>
      <Progress percent={percent} showInfo={false} size="small" strokeColor={color} />
    </Flexbox>
  );
});

const STEP_STATUS: Record<(typeof STEP_STATUSES)[number], 'error' | 'finish' | 'process' | 'wait'> =
  { current: 'process', done: 'finish', error: 'error', todo: 'wait' };

type StepInput = { detail?: unknown; meta?: unknown; status?: string; title?: unknown };

export const StepsView = define('Steps', ({ props }) => {
  const items = rowsOf<StepInput>(props.items, A2UI_LIST_LIMITS.Steps.items);
  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      <Heading>{props.title}</Heading>
      <Steps
        orientation={props.orientation ?? 'vertical'}
        items={items.map((item, index) => ({
          description:
            item.detail || item.meta ? (
              <Flexbox gap={2}>
                {item.meta ? (
                  <Text className={styles.figure} fontSize={12} type="secondary">
                    {cell(item.meta)}
                  </Text>
                ) : null}
                {item.detail ? <Text type="secondary">{cell(item.detail)}</Text> : null}
              </Flexbox>
            ) : undefined,
          key: index,
          status: STEP_STATUS[item.status as keyof typeof STEP_STATUS] ?? 'wait',
          title: cell(item.title),
        }))}
      />
    </Flexbox>
  );
});

export const StatisticView = define('Statistic', ({ props }) => (
  <Flexbox gap={4} style={{ minWidth: 0 }}>
    <Text fontSize={13} type="secondary">
      {String(props.label ?? '')}
    </Text>
    <Text
      className={styles.figure}
      fontSize={28}
      style={{ color: COLOR[props.tone as string], lineHeight: 1.2 }}
      weight={600}
    >
      {props.prefix ? String(props.prefix) : null}
      {String(props.value ?? '')}
      {props.suffix ? (
        <Text as="span" fontSize={14} type="secondary" weight={400}>
          {` ${String(props.suffix)}`}
        </Text>
      ) : null}
    </Text>
    {props.caption ? (
      <Text fontSize={12} type="secondary">
        {String(props.caption)}
      </Text>
    ) : null}
  </Flexbox>
));

export const TagView = define('Tag', ({ props }) => (
  <Tag
    color={props.color === 'default' ? undefined : props.color}
    icon={
      props.icon ? <A2uiIcon color="currentColor" name={String(props.icon)} size={12} /> : undefined
    }
  >
    {String(props.text ?? '')}
  </Tag>
));

export const CalloutView = define('Callout', ({ props }) => (
  <Alert
    showIcon
    title={<Text weight={600}>{String(props.title ?? '')}</Text>}
    type={props.level}
    variant="outlined"
    description={
      props.body ? (
        <Markdown fontSize={13} variant="chat">
          {String(props.body)}
        </Markdown>
      ) : undefined
    }
  />
));

export const AvatarView = define('Avatar', ({ props }) => {
  const src = safeUrl(props.src);
  const text = props.text ? String(props.text) : undefined;
  if (!src && !text) return null;
  return (
    <Avatar
      avatar={src ?? text}
      fallbackVariant="text"
      shape={props.shape === 'square' ? 'square' : 'circle'}
      size={Number(props.size ?? 32)}
      title={text}
    />
  );
});

export const CodeView = define('Code', ({ props }) => (
  <Highlighter
    copyable
    language={String(props.language ?? 'txt')}
    showLanguage={!!props.language}
    style={{ minWidth: 0 }}
    variant="filled"
  >
    {String(props.code ?? '')}
  </Highlighter>
));
