import {
  Alert,
  Descriptions,
  Flexbox,
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
import { useEffect, useState } from 'react';

import { A2UI_LIST_LIMITS, type ITEM_STATUSES, type STEP_STATUSES } from '../../catalog';
import { useA2uiStatusLabels } from '../host';
import { metricColumns } from '../metricLayout';
import { cell, define, Heading, rowsOf, safeUrl, styles, TONE, type Tone } from './shared';

// --- Basic catalog ---------------------------------------------------------------------------

const HEADING = /^(#{1,6})\s+(\S[^\n]*)$/;
const HEADING_SIZE = [24, 20, 18, 16, 14, 14];

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
      <Text as="div" fontSize={12} type="secondary">
        {text}
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

// --- LobeHub extensions ----------------------------------------------------------------------

export const TagView = define('Tag', ({ props }) => (
  <Tag color={props.color === 'default' ? undefined : props.color}>{String(props.text ?? '')}</Tag>
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
          value: item.value,
          valueTone: item.tone === 'bad' ? 'danger' : undefined,
        }))}
      />
    </div>
  );
});

const STATUS_TAG: Record<
  (typeof ITEM_STATUSES)[number],
  { color?: 'error' | 'info' | 'success' | 'warning' }
> = {
  blocked: {},
  done: { color: 'success' },
  human: { color: 'warning' },
  new: { color: 'error' },
  watch: { color: 'info' },
  worse: { color: 'error' },
};

type ItemInput = { detail?: string; status?: string; statusLabel?: string; title: string };

export const ItemsView = define('Items', ({ props }) => {
  const labels = useA2uiStatusLabels();
  const items = rowsOf<ItemInput>(props.items, A2UI_LIST_LIMITS.Items.items);
  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      <Flexbox horizontal align="center" gap={6}>
        <Text weight={600}>{String(props.title ?? '')}</Text>
        <Tag size="small">{items.length}</Tag>
      </Flexbox>
      <div className={styles.items}>
        {items.map((item, index) => {
          const status = STATUS_TAG[item.status as keyof typeof STATUS_TAG];
          return (
            // eslint-disable-next-line @eslint-react/no-array-index-key
            <Flexbox horizontal className={styles.item} gap={10} key={index}>
              {status ? (
                <div className={styles.status}>
                  <Tag color={status.color} size="small">
                    {item.statusLabel ?? labels[item.status as keyof typeof labels]}
                  </Tag>
                </div>
              ) : null}
              <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
                <Markdown fontSize={13} variant="chat">
                  {String(item.title)}
                </Markdown>
                {item.detail ? (
                  <Text fontSize={12} type="secondary">
                    {item.detail}
                  </Text>
                ) : null}
              </Flexbox>
            </Flexbox>
          );
        })}
      </div>
    </Flexbox>
  );
});

export const BarsView = define('Bars', ({ props }) => {
  const values = (Array.isArray(props.values) ? (props.values as unknown[]) : [])
    .slice(0, A2UI_LIST_LIMITS.Bars.values)
    .map(Number);
  const marks = (props.marks ?? {}) as Record<string, Tone>;
  const labels = Array.isArray(props.labels) ? (props.labels as unknown[]).map(String) : [];
  const max = Math.max(...values, 0) || 1;
  const unit = props.unit ? String(props.unit) : '';
  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      <Flexbox horizontal justify="space-between">
        <Text weight={600}>{String(props.title ?? '')}</Text>
        {props.caption ? (
          <Text fontSize={12} type="secondary">
            {String(props.caption)}
          </Text>
        ) : null}
      </Flexbox>
      <Flexbox horizontal align="flex-end" className={styles.bars} gap={3}>
        {values.map((value, index) => (
          <div
            className={styles.bar}
            // eslint-disable-next-line @eslint-react/no-array-index-key
            key={index}
            title={`${labels[index] ?? index}: ${value}${unit}`}
            style={{
              background: marks[index]
                ? TONE[marks[index]]
                : 'var(--lobe-color-fill-secondary, #0000000f)',
              height: `${(value / max) * 100}%`,
            }}
          />
        ))}
      </Flexbox>
      {labels.length > 0 ? (
        <Flexbox horizontal justify="space-between">
          {labels.map((label, index) => (
            // eslint-disable-next-line @eslint-react/no-array-index-key
            <Text fontSize={11} key={index} type="secondary">
              {label}
            </Text>
          ))}
        </Flexbox>
      ) : null}
    </Flexbox>
  );
});

type TableColumnInput = { align?: 'center' | 'end' | 'start'; key: string; label?: string };

export const TableView = define('Table', ({ props }) => {
  const columns = rowsOf<TableColumnInput>(props.columns, 8).filter(
    (column) => typeof column.key === 'string',
  );
  const rows = rowsOf<Record<string, unknown>>(props.rows, A2UI_LIST_LIMITS.Table.rows);
  if (columns.length === 0) return null;
  return (
    <Flexbox className={styles.table} gap={8}>
      <Heading>{props.title}</Heading>
      <Table
        dataSource={rows}
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
  const tone = props.tone as Tone | undefined;
  const color = tone && tone !== 'neutral' ? TONE[tone] : undefined;
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
