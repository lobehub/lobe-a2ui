import {
  Accordion,
  Agenda,
  Alert,
  Avatar,
  AvatarGroup,
  ComparisonTable,
  Descriptions,
  Empty,
  Highlighter,
  Progress,
  Rate,
  Steps,
  Table,
  Tag,
} from '@lobehub/ui';
import { MetricStrip, Section, StatCard } from '@lobehub/ui/dashboard';
import type { ReactNode } from 'react';

import { A2UI_LIST_LIMITS } from '../../constants';
import { useA2uiHost } from '../host';
import { formatNumber, isNumberFormat } from './format';
import { useLucideIcon } from './icon';
import { cell, childrenOf, define, rowsOf } from './shared';

/**
 * The official playground's data and feedback components, drawn with @lobehub/ui in its `a2ui`
 * variant: the official card, type and spacing, LobeHub's colours.
 */

type Row = Record<string, unknown>;
const text = (value: unknown) => (value === undefined || value === null ? undefined : String(value));
const DIRECTIONS = new Set(['up', 'down', 'flat']);
const directionOf = (value: unknown) =>
  DIRECTIONS.has(value as string) ? (value as 'up' | 'down' | 'flat') : undefined;

// --- KPIs ----------------------------------------------------------------------------------------

export const StatView = define('Stat', ({ props }) => {
  const icon = useLucideIcon(typeof props.icon === 'string' ? props.icon : undefined);
  return (
    <StatCard
      delta={text(props.delta)}
      direction={directionOf(props.trend)}
      hint={text(props.caption)}
      label={text(props.label) ?? ''}
      mark={icon}
      value={text(props.value) ?? ''}
      variant="a2ui"
      valueTone={
        props.tone === 'negative' ? 'danger' : props.tone === 'warning' ? 'warning' : undefined
      }
    />
  );
});

export const StatGroupView = define('StatGroup', ({ props }) => (
  <MetricStrip
    variant="a2ui"
    items={rowsOf<Row>(props.items, A2UI_LIST_LIMITS.StatGroup.items).map((item) => ({
      delta: text(item.delta),
      direction: directionOf(item.trend),
      label: text(item.label) ?? '',
      value: text(item.value) ?? '',
    }))}
  />
));

// --- Tables and lists -----------------------------------------------------------------------------

/** A status word's tone, as the official DataTable reads badges: green for done, amber for waiting. */
const STATUS_TONE: [RegExp, string][] = [
  [/^(active|paid|done|complete|completed|approved|live|healthy|online|shipped|delivered|resolved|success|passed|on track)$/i, 'success'],
  [/^(pending|trial|review|in review|in progress|waiting|draft|scheduled|queued|at risk|degraded|warning|paused)$/i, 'warning'],
  [/^(overdue|failed|failing|blocked|cancelled|canceled|declined|error|offline|down|churned|rejected|critical|late)$/i, 'error'],
  [/^(new|info|beta|open|planned)$/i, 'info'],
];
const badgeTone = (value: string) =>
  STATUS_TONE.find(([pattern]) => pattern.test(value.trim()))?.[1] ?? 'purple';

const badge = (value: string, color?: string) => (
  <Tag color={color ?? badgeTone(value)} shape="round" size="small" variant="a2ui">
    {value}
  </Tag>
);

const dateText = (value: unknown, locale?: string) => {
  if (typeof value !== 'string' && typeof value !== 'number') return cell(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? cell(value)
    : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
        date,
      );
};

type ColumnInput = { align?: string; format?: string; key: string; label?: string };

export const DataTableView = define('DataTable', ({ props }) => {
  const locale = useA2uiHost()?.locale;
  const columns = rowsOf<ColumnInput>(props.columns, 12).filter(
    (column) => typeof column.key === 'string',
  );
  const rows = rowsOf<Row>(props.rows, A2UI_LIST_LIMITS.DataTable.rows);
  const pageSize = Number(props.pageSize) || 10;
  const title = text(props.title);
  return (
    <Table<Row>
      dataSource={rows}
      pagination={rows.length > pageSize ? { pageSize } : false}
      rowKey={(_, index) => String(index)}
      searchable={props.searchable === true}
      title={title ? () => title : undefined}
      variant="a2ui"
      columns={columns.map((column) => {
        const numeric = isNumberFormat(column.format);
        return {
          align: column.align === 'right' || numeric ? ('right' as const) : undefined,
          dataIndex: column.key,
          key: column.key,
          render: (value: unknown): ReactNode => {
            if (column.format === 'badge') return value === '' || value == null ? null : badge(cell(value));
            if (column.format === 'date') return dateText(value, locale);
            if (numeric && typeof value === 'number')
              return formatNumber(value, column.format as never, locale);
            return cell(value);
          },
          sorter: (a: Row, b: Row) => {
            const x = a[column.key];
            const y = b[column.key];
            return typeof x === 'number' && typeof y === 'number'
              ? x - y
              : cell(x).localeCompare(cell(y));
          },
          title: column.label ?? column.key,
        };
      })}
    />
  );
});

export const KeyValueListView = define('KeyValueList', ({ props }) => (
  <Descriptions
    column={Number(props.columns) || 1}
    title={text(props.title)}
    variant="a2ui"
    items={rowsOf<Row>(props.items, A2UI_LIST_LIMITS.KeyValueList.items).map((item, index) => ({
      children: cell(item.value),
      hint: text(item.hint),
      key: index,
      label: cell(item.label),
    }))}
  />
));

const STEP_STATUS = { current: 'process', done: 'finish', upcoming: 'wait' } as const;

export const TimelineView = define('Timeline', ({ props }) => (
  <Steps
    orientation="vertical"
    variant="a2ui"
    items={rowsOf<Row>(props.items, A2UI_LIST_LIMITS.Timeline.items).map((item, index) => ({
      description: text(item.description),
      key: index,
      status: STEP_STATUS[item.status as keyof typeof STEP_STATUS] ?? 'wait',
      time: text(item.time),
      title: cell(item.title),
    }))}
  />
));

export const AgendaView = define('Agenda', ({ props }) => {
  const locale = useA2uiHost()?.locale;
  return (
    <Agenda
      days={rowsOf<Row>(props.days, A2UI_LIST_LIMITS.Agenda.days) as never}
      locale={locale}
      title={text(props.title)}
      variant="a2ui"
    />
  );
});

export const ComparisonTableView = define('ComparisonTable', ({ props }) => (
  <ComparisonTable
    highlight={typeof props.highlight === 'number' ? props.highlight : undefined}
    options={(Array.isArray(props.options) ? props.options : []).map(String).slice(0, 5)}
    rows={rowsOf<Row>(props.rows, A2UI_LIST_LIMITS.ComparisonTable.rows) as never}
    title={text(props.title)}
    variant="a2ui"
  />
));

// --- Progress, ratings, people, tags --------------------------------------------------------------

const PROGRESS_STATUS: Record<string, 'success' | 'exception' | 'normal'> = {
  error: 'exception',
  negative: 'exception',
  positive: 'success',
  success: 'success',
};

const percentOf = (props: Record<string, unknown>) => {
  // Stored 1.x cards may give a `max`; the official prop is already 0-100.
  const max = Number(props.max ?? 100) || 100;
  return Math.max(0, Math.min(100, Math.round((Number(props.value ?? 0) / max) * 100)));
};

export const ProgressView = define('Progress', ({ props }) => (
  <Progress
    caption={text(props.caption)}
    label={text(props.label)}
    percent={percentOf(props)}
    status={PROGRESS_STATUS[props.tone as string] ?? 'normal'}
    type={props.variant === 'circle' ? 'circle' : 'line'}
    variant="a2ui"
  />
));

export const RadialProgressView = define('RadialProgress', ({ props }) => {
  const display = text(props.display);
  return (
    <Progress
      format={display ? () => display : undefined}
      label={text(props.label)}
      percent={percentOf(props)}
      status={PROGRESS_STATUS[props.tone as string] ?? 'normal'}
      type="circle"
      variant="a2ui"
    />
  );
});

export const RatingView = define('Rating', ({ props }) => (
  <Rate
    allowHalf
    readOnly
    label={text(props.label)}
    reviewCount={typeof props.count === 'number' ? props.count : undefined}
    value={Math.max(0, Math.min(5, Number(props.value ?? 0)))}
    variant="a2ui"
  />
));

type Person = { image?: unknown; name?: unknown };

export const AvatarGroupView = define('AvatarGroup', ({ props }) => (
  <AvatarGroup
    label={text(props.label)}
    max={Number(props.max) || 5}
    variant="a2ui"
    items={rowsOf<Person>(props.people, A2UI_LIST_LIMITS.AvatarGroup.people).map((person) => ({
      avatar: text(person.image),
      key: cell(person.name),
      title: cell(person.name),
    }))}
  />
));

const AVATAR_SIZE = { lg: 44, md: 36, sm: 28 } as const;

export const AvatarView = define('Avatar', ({ props }) => {
  // The official Avatar names a person; stored 1.x cards give a picture or initials only.
  const name = text(props.name) ?? text(props.text);
  const image = text(props.image) ?? text(props.src);
  const size =
    typeof props.size === 'number'
      ? props.size
      : (AVATAR_SIZE[props.size as keyof typeof AVATAR_SIZE] ?? AVATAR_SIZE.md);
  if (!name && !image) return null;
  const avatar = (
    <Avatar
      avatar={image ?? name}
      fallbackVariant="text"
      shape={props.shape === 'square' ? 'square' : 'circle'}
      size={size}
      title={name}
    />
  );
  if (!props.name) return avatar;
  return (
    <div style={{ alignItems: 'center', display: 'flex', gap: 10, minWidth: 0 }}>
      {avatar}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</span>
        {props.subtitle ? (
          <span style={{ color: 'var(--a2-muted)', fontSize: 12 }}>{text(props.subtitle)}</span>
        ) : null}
      </div>
    </div>
  );
});

const TONE_COLOR: Record<string, string | undefined> = {
  accent: 'purple',
  danger: 'error',
  default: undefined,
  discovery: 'discovery',
  info: 'info',
  negative: 'error',
  positive: 'success',
  secondary: undefined,
  success: 'success',
  warning: 'warning',
};

export const TagListView = define('TagList', ({ props }) => {
  const tags = (Array.isArray(props.tags) ? props.tags : []).map(String).slice(0, A2UI_LIST_LIMITS.TagList.tags);
  const color = TONE_COLOR[props.tone as string];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
      {tags.map((tag) => (
        <Tag color={color} key={tag} variant="a2ui">
          {tag}
        </Tag>
      ))}
    </div>
  );
});

export const BadgeView = define('Badge', ({ props }) => (
  <span style={{ display: 'inline-flex' }}>
    <Tag
      color={TONE_COLOR[(props.color as string) ?? 'secondary']}
      shape="round"
      size={props.size === 'lg' ? 'middle' : 'small'}
      variant="a2ui"
    >
      {text(props.label) ?? ''}
    </Tag>
  </span>
));

// --- Feedback --------------------------------------------------------------------------------------

const ALERT_TYPE = new Set(['info', 'success', 'warning', 'error']);

export const AlertView = define('Alert', ({ props }) => (
  <Alert
    description={text(props.message)}
    title={text(props.title)}
    type={ALERT_TYPE.has(props.tone as string) ? (props.tone as never) : 'info'}
    variant="a2ui"
  />
));

export const CalloutView = define('Callout', ({ props }) => {
  // Stored 1.x Callouts carry a level and a body: they draw as an Alert of that level.
  if (props.level || props.body)
    return (
      <Alert
        description={text(props.body)}
        title={text(props.title)}
        type={ALERT_TYPE.has(props.level as string) ? (props.level as never) : 'info'}
        variant="a2ui"
      />
    );
  const onAction = typeof props.onAction === 'function' ? (props.onAction as () => void) : undefined;
  return (
    <Alert
      description={text(props.text)}
      title={text(props.title)}
      variant="a2ui-callout"
      action={
        props.actionLabel && onAction ? { label: String(props.actionLabel), onClick: onAction } : undefined
      }
    />
  );
});

export const EmptyStateView = define('EmptyState', ({ props }) => {
  const icon = useLucideIcon(typeof props.icon === 'string' ? props.icon : undefined);
  const onAction = typeof props.onAction === 'function' ? (props.onAction as () => void) : undefined;
  return (
    <Empty
      description={text(props.description)}
      icon={icon}
      title={text(props.title)}
      variant="a2ui"
      action={
        props.actionLabel && onAction ? { label: String(props.actionLabel), onClick: onAction } : undefined
      }
    />
  );
});

export const CodeBlockView = define('CodeBlock', ({ props }) => (
  <Highlighter
    copyable
    fileName={text(props.filename)}
    language={text(props.language) ?? 'txt'}
    variant="a2ui"
  >
    {String(props.code ?? '')}
  </Highlighter>
));

type AccordionInput = { child?: unknown; text?: unknown; title?: unknown };

export const AccordionView = define('Accordion', ({ props, buildChild }) => {
  const items = rowsOf<AccordionInput>(props.items, A2UI_LIST_LIMITS.Accordion.items);
  return (
    <Accordion
      defaultValue={props.multiple ? [] : ['0']}
      multiple={props.multiple === true}
      variant="a2ui"
      items={items.map((item, index) => ({
        children: (
          <>
            {item.text ? <p style={{ margin: 0 }}>{String(item.text)}</p> : null}
            {typeof item.child === 'string' ? buildChild(item.child) : null}
          </>
        ),
        key: String(index),
        title: cell(item.title),
      }))}
    />
  );
});

export const SectionView = define('Section', ({ props, buildChild }) => (
  <Section desc={text(props.description)} eyebrow={text(props.eyebrow)} title={text(props.title)} variant="a2ui">
    {childrenOf(props.children, buildChild)}
  </Section>
));
