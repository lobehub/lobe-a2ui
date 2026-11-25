import { createComponentImplementation } from '@a2ui/react';
import {
  ButtonApi,
  CheckBoxApi,
  ChoicePickerApi,
  ColumnApi,
  DividerApi,
  ImageApi,
  RowApi,
  SliderApi,
  TextApi,
  TextFieldApi,
} from '@a2ui/web_core/v1_0';
import { AreaChart, BarChart, BarList, DonutChart, Legend, LineChart } from '@lobehub/charts';
import {
  Alert,
  Button,
  Checkbox,
  createStaticStyles,
  cssVar,
  Divider,
  Flexbox,
  Image,
  Input,
  Markdown,
  Slider,
  Tag,
  Text,
  TextArea,
} from '@lobehub/ui';
import { type MetricItem, MetricStrip, Surface } from '@lobehub/ui/dashboard';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import type { ITEM_STATUSES } from '../catalog';
import { BarsApi, CalloutApi, CardApi, ChartApi, ItemsApi, MetricsApi, TagApi } from '../catalog';
import { useA2uiStatusLabels } from './host';
import { metricColumns } from './metricLayout';

type BuildChild = (id: string, basePath?: string) => ReactNode;
type ChildRef = string | { basePath: string; id: string };

const childrenOf = (list: unknown, buildChild: BuildChild) =>
  (Array.isArray(list) ? (list as ChildRef[]) : []).map((ref) =>
    typeof ref === 'string' ? buildChild(ref) : buildChild(ref.id, ref.basePath),
  );

const JUSTIFY = {
  center: 'center',
  end: 'flex-end',
  spaceAround: 'space-around',
  spaceBetween: 'space-between',
  spaceEvenly: 'space-evenly',
  start: 'flex-start',
  stretch: 'stretch',
} as const;
const ALIGN = {
  center: 'center',
  end: 'flex-end',
  start: 'flex-start',
  stretch: 'stretch',
} as const;
const HEADING = /^#{1,6}\s+/;

const TONE = {
  bad: cssVar.colorError,
  good: cssVar.colorSuccess,
  neutral: cssVar.colorTextSecondary,
  warn: cssVar.colorWarning,
} as const;
type Tone = keyof typeof TONE;

const styles = createStaticStyles(({ css, cssVar: token }) => ({
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
}));

/**
 * Metrics in an A2UI card. A card sits in a chat column (about 320–680px), where MetricStrip's
 * dashboard grid (`minmax(180px, 1fr)` columns, 16/20px cells, heading-size figures) wraps four
 * figures onto two rows. Peer figures read as one row, so inside a card the strip keeps one
 * column per figure and a compact cell. MetricStrip has no slot props for these parts, so the
 * rules target its stable BEM classes.
 */
const fallback = createStaticStyles(({ css }) => ({
  metrics: css`
    container-type: inline-size;

    .lobe-dashboard-metric-strip__grid,
    .lobe-dashboard-metric-strip[data-variant='split'] {
      grid-template-columns: repeat(var(--a2ui-metric-columns, 4), minmax(0, 1fr));
    }

    .lobe-dashboard-metric-strip__cell {
      gap: 2px;
      padding-block: 10px;
      padding-inline: 12px;
    }

    .lobe-dashboard-metric-strip__head {
      height: auto;
    }

    .lobe-dashboard-metric-strip__label {
      font-size: 12px;
    }

    .lobe-dashboard-metric-strip__value {
      font-size: 18px;
      line-height: 1.4;
    }

    .lobe-dashboard-metric-strip__foot {
      flex-wrap: nowrap;
      gap: 4px;
      min-width: 0;
      font-size: 12px;
    }

    /* A change reads on one line; what does not fit is cut, never stacked under the figure. */
    .lobe-dashboard-metric-strip__delta,
    .lobe-dashboard-metric-strip__hint {
      overflow: hidden;
      min-width: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* A narrow column (a phone, a side panel) tightens before it has to wrap. */
    @container (max-width: 480px) {
      .lobe-dashboard-metric-strip__cell {
        padding-inline: 8px;
      }

      .lobe-dashboard-metric-strip__value {
        font-size: 15px;
      }

      .lobe-dashboard-metric-strip__label,
      .lobe-dashboard-metric-strip__foot {
        font-size: 11px;
      }
    }
  `,
}));

// --- Layout --------------------------------------------------------------------------------

const CardView = createComponentImplementation(CardApi, ({ props, buildChild }) => (
  <Surface
    description={props.description ? String(props.description) : undefined}
    extra={props.badge ? buildChild(props.badge as string) : undefined}
    title={props.title ? String(props.title) : undefined}
  >
    {buildChild(props.child as string)}
  </Surface>
));

const ColumnView = createComponentImplementation(ColumnApi, ({ props, buildChild }) => (
  <Flexbox
    align={ALIGN[props.align ?? 'stretch']}
    gap={12}
    justify={JUSTIFY[props.justify ?? 'start']}
  >
    {childrenOf(props.children, buildChild)}
  </Flexbox>
));

const RowView = createComponentImplementation(RowApi, ({ props, buildChild }) => (
  <Flexbox
    horizontal
    align={ALIGN[props.align ?? 'center']}
    gap={8}
    justify={JUSTIFY[props.justify ?? 'start']}
    wrap="wrap"
  >
    {childrenOf(props.children, buildChild)}
  </Flexbox>
));

const DividerView = createComponentImplementation(DividerApi, () => (
  <Divider style={{ margin: 0 }} />
));

// --- Content -------------------------------------------------------------------------------

const TextView = createComponentImplementation(TextApi, ({ props }) => {
  const text = String(props.text ?? '');
  if (HEADING.test(text))
    return (
      <Text fontSize={16} weight={600}>
        {text.replace(HEADING, '')}
      </Text>
    );
  if (props.variant === 'caption')
    return (
      <Text fontSize={12} type="secondary">
        {text}
      </Text>
    );
  return (
    <Markdown fontSize={14} variant="chat">
      {text}
    </Markdown>
  );
});

const TagView = createComponentImplementation(TagApi, ({ props }) => (
  <Tag color={props.color === 'default' ? undefined : props.color}>{String(props.text)}</Tag>
));

const ImageView = createComponentImplementation(ImageApi, ({ props }) => {
  const url = String(props.url ?? '');
  // Validation keeps http out; a data-bound url is checked again here.
  if (!url.startsWith('https://')) return null;
  return <Image alt={String(props.description ?? '')} src={url} style={{ maxWidth: '100%' }} />;
});

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

const MetricsView = createComponentImplementation(MetricsApi, ({ props }) => {
  const [strip, setStrip] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(strip);
  const items = Array.isArray(props.items) ? (props.items as MetricInput[]) : [];
  // Peers share one row while each cell stays readable, then wrap into balanced rows.
  return (
    <div
      className={fallback.metrics}
      ref={setStrip}
      style={{ '--a2ui-metric-columns': metricColumns(items.length, width) } as CSSProperties}
    >
      <MetricStrip
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

const CalloutView = createComponentImplementation(CalloutApi, ({ props }) => (
  <Alert
    showIcon
    title={<Text weight={600}>{String(props.title)}</Text>}
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

const ItemsView = createComponentImplementation(ItemsApi, ({ props }) => {
  const labels = useA2uiStatusLabels();
  const items = Array.isArray(props.items) ? (props.items as ItemInput[]) : [];
  return (
    <Flexbox gap={8}>
      <Flexbox horizontal align="center" gap={6}>
        <Text weight={600}>{String(props.title)}</Text>
        <Tag size="small">{items.length}</Tag>
      </Flexbox>
      <div className={styles.items}>
        {items.map((item, index) => {
          const status = STATUS_TAG[item.status as keyof typeof STATUS_TAG];
          return (
            <Flexbox
              horizontal
              className={styles.item}
              gap={10}
              key={index}
            >
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

const BarsView = createComponentImplementation(BarsApi, ({ props }) => {
  const values = Array.isArray(props.values) ? (props.values as unknown[]).map(Number) : [];
  const marks = (props.marks ?? {}) as Record<string, Tone>;
  const labels = Array.isArray(props.labels) ? (props.labels as unknown[]).map(String) : [];
  const max = Math.max(...values, 0) || 1;
  const unit = props.unit ? String(props.unit) : '';
  return (
    <Flexbox gap={8}>
      <Flexbox horizontal justify="space-between">
        <Text weight={600}>{String(props.title)}</Text>
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
            key={index}
            style={{ background: marks[index] ? TONE[marks[index]] : cssVar.colorFillSecondary, height: `${(value / max) * 100}%` }}
            title={`${labels[index] ?? index}: ${value}${unit}`}
          />
        ))}
      </Flexbox>
      {labels.length > 0 ? (
        <Flexbox horizontal justify="space-between">
          {labels.map((label) => (
            <Text fontSize={11} key={label} type="secondary">
              {label}
            </Text>
          ))}
        </Flexbox>
      ) : null}
    </Flexbox>
  );
});

const SERIES_CHARTS = { area: AreaChart, bar: BarChart, line: LineChart } as const;
/** Chat-width cards: tall enough to read a trend, short enough not to crowd the reply. */
const CHART_HEIGHT = 180;

const ChartView = createComponentImplementation(ChartApi, ({ props }) => {
  const rows = (Array.isArray(props.data) ? props.data : []) as Record<string, unknown>[];
  const index = String(props.index ?? '');
  const categories = (Array.isArray(props.categories) ? props.categories : []).map(String);
  const unit = props.unit ? String(props.unit) : '';
  const format = (value: number) => `${value.toLocaleString()}${unit}`;
  if (rows.length === 0 || categories.length === 0) return null;

  let chart: ReactNode;
  if (props.type === 'donut') {
    // A donut names its slices beside it; without the legend the colours mean nothing.
    chart = (
      <Flexbox horizontal align="center" gap={16}>
        <DonutChart
          showLabel
          category={categories[0]}
          data={rows}
          index={index}
          style={{ flex: 'none', height: 120, width: 120 }}
          valueFormatter={format}
        />
        <Legend categories={rows.map((row) => String(row[index] ?? ''))} />
      </Flexbox>
    );
  } else if (props.type === 'barList') {
    chart = (
      <BarList
        valueFormatter={format}
        data={rows.map((row) => ({
          name: String(row[index] ?? ''),
          value: Number(row[categories[0]] ?? 0),
        }))}
      />
    );
  } else {
    const Series = SERIES_CHARTS[props.type as keyof typeof SERIES_CHARTS] ?? LineChart;
    chart = (
      <Series
        categories={categories}
        data={rows}
        height={CHART_HEIGHT}
        index={index}
        showLegend={categories.length > 1}
        startEndOnly={rows.length > 12}
        valueFormatter={format}
        yAxisWidth={44}
      />
    );
  }

  // Charts side by side in a Row share its width.
  return (
    <Flexbox flex={1} gap={8} style={{ minWidth: 0 }}>
      {props.title ? <Text weight={600}>{String(props.title)}</Text> : null}
      {chart}
    </Flexbox>
  );
});

// --- Input ---------------------------------------------------------------------------------

const Label = ({ children }: { children: ReactNode }) =>
  children ? <Text weight={500}>{children}</Text> : null;

const ButtonView = createComponentImplementation(ButtonApi, ({ props, buildChild }) => {
  const primary = props.variant === 'primary';
  return (
    <Button
      disabled={props.isValid === false}
      // Secondary actions sit back as fill buttons, so the one primary action leads.
      type={primary ? 'primary' : props.variant === 'borderless' ? 'text' : 'fill'}
      onClick={() => (props.action as (() => void) | undefined)?.()}
    >
      {props.child ? buildChild(props.child as string) : null}
    </Button>
  );
});

const TextFieldView = createComponentImplementation(TextFieldApi, ({ props }) => {
  const value = String(props.value ?? '');
  const onChange = (next: string) =>
    props.setValue?.(props.variant === 'number' ? Number(next) : next);
  return (
    <Flexbox gap={6}>
      <Label>{props.label ? String(props.label) : null}</Label>
      {props.variant === 'longText' ? (
        <TextArea
          autoSize={{ maxRows: 6, minRows: 2 }}
          placeholder={props.placeholder ? String(props.placeholder) : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          placeholder={props.placeholder ? String(props.placeholder) : undefined}
          value={value}
          type={
            props.variant === 'obscured'
              ? 'password'
              : props.variant === 'number'
                ? 'number'
                : 'text'
          }
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {props.validationErrors?.map((error) => (
        <Text fontSize={12} key={error} type="danger">
          {error}
        </Text>
      ))}
    </Flexbox>
  );
});

const CheckBoxView = createComponentImplementation(CheckBoxApi, ({ props }) => (
  <Checkbox checked={!!props.value} onChange={(checked) => props.setValue?.(!!checked)}>
    {String(props.label ?? '')}
  </Checkbox>
));

const ChoicePickerView = createComponentImplementation(ChoicePickerApi, ({ props }) => {
  const selected = Array.isArray(props.value) ? (props.value as string[]) : [];
  const single = props.variant === 'mutuallyExclusive';
  const options = (Array.isArray(props.options) ? props.options : []) as {
    label: unknown;
    value: string;
  }[];
  const toggle = (value: string) =>
    props.setValue?.(
      single
        ? [value]
        : selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
    );
  return (
    <Flexbox gap={8}>
      <Label>{props.label ? String(props.label) : null}</Label>
      <Flexbox horizontal gap={8} wrap="wrap">
        {options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <Button
              aria-pressed={on}
              key={option.value}
              type={on ? 'primary' : 'fill'}
              onClick={() => toggle(option.value)}
            >
              {String(option.label)}
            </Button>
          );
        })}
      </Flexbox>
    </Flexbox>
  );
});

const SliderView = createComponentImplementation(SliderApi, ({ props }) => (
  <Flexbox gap={4}>
    <Flexbox horizontal justify="space-between">
      <Label>{props.label ? String(props.label) : null}</Label>
      <Text className={styles.figure} type="secondary">
        {Number(props.value ?? 0)}
      </Text>
    </Flexbox>
    <Slider
      max={Number(props.max ?? 100)}
      min={Number(props.min ?? 0)}
      value={Number(props.value ?? 0)}
      onChange={(value) => props.setValue?.(Number(value))}
    />
  </Flexbox>
));

/** The @lobehub/ui implementation of every component in the catalog. */
export const LOBE_COMPONENTS = [
  CardView,
  ColumnView,
  RowView,
  TextView,
  DividerView,
  ButtonView,
  TagView,
  MetricsView,
  CalloutView,
  ItemsView,
  BarsView,
  ChartView,
  ImageView,
  TextFieldView,
  CheckBoxView,
  ChoicePickerView,
  SliderView,
];
