import {
  AreaChart,
  BarChart,
  CandlestickChart,
  DonutChart,
  GaugeChart,
  HeatmapChart,
  LineChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SparkAreaChart,
  TreemapChart,
} from '@lobehub/charts';

import { A2UI_LIST_LIMITS } from '../../constants';
import { useA2uiHost } from '../host';
import { define, rowsOf } from './shared';

/**
 * The official playground's charts (LineChart, AreaChart, BarChart, PieChart, ScatterChart,
 * RadarChart, Heatmap, Gauge, Treemap, SankeyChart, CandlestickChart, Sparkline), drawn with
 * @lobehub/charts in its `a2ui` variant: the official frame and layout, LobeHub's palette.
 * The catalog's data is long-format (`[{x, y, series?}]`); the cartesian charts take it wide.
 */

type Row = Record<string, unknown>;
const FORMATS = new Set(['number', 'compact', 'currency', 'percent']);
const formatOf = (value: unknown) =>
  typeof value === 'string' && FORMATS.has(value)
    ? (value as 'number' | 'compact' | 'currency' | 'percent')
    : undefined;
const text = (value: unknown) =>
  value === undefined || value === null ? undefined : String(value);
const num = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** `[{x, y, series?}]` → one row per x with a column per series, in first-seen order. */
const widen = (data: unknown, max: number, x = 'x', y = 'y') => {
  const rows = rowsOf<Row>(data, max).filter((row) => num(row[y]) !== undefined);
  const series: string[] = [];
  const byX = new Map<string, Row>();
  for (const row of rows) {
    const name = typeof row.series === 'string' && row.series ? row.series : 'value';
    if (!series.includes(name)) series.push(name);
    const key = String(row[x] ?? '');
    const wide = byX.get(key) ?? { __x: row[x] };
    wide[name] = row[y];
    byX.set(key, wide);
  }
  return { categories: series, rows: [...byX.values()] };
};

/** What every chart shares: its header, number format and height. */
const common = (props: Record<string, unknown>) => ({
  format: formatOf(props.format),
  height: num(props.height),
  subtitle: text(props.subtitle),
  title: text(props.title),
  unit: text(props.unit),
  variant: 'a2ui' as const,
});

export const LineChartView = define('LineChart', ({ props }) => {
  const { categories, rows } = widen(props.data, A2UI_LIST_LIMITS.LineChart.data);
  return (
    <LineChart
      {...common(props)}
      categories={categories}
      curveType={props.curve === 'linear' ? 'linear' : 'monotone'}
      data={rows}
      index="__x"
    />
  );
});

export const AreaChartView = define('AreaChart', ({ props }) => {
  const { categories, rows } = widen(props.data, A2UI_LIST_LIMITS.AreaChart.data);
  return (
    <AreaChart
      {...common(props)}
      categories={categories}
      data={rows}
      index="__x"
      stack={props.stacked !== false && categories.length > 1}
    />
  );
});

export const BarChartView = define('BarChart', ({ props }) => {
  const { categories, rows } = widen(props.data, A2UI_LIST_LIMITS.BarChart.data);
  return (
    <BarChart
      {...common(props)}
      categories={categories}
      data={rows}
      index="__x"
      layout={props.horizontal === true ? 'vertical' : 'horizontal'}
      stack={props.stacked === true}
    />
  );
});

export const PieChartView = define('PieChart', ({ props }) => {
  const rows = rowsOf<Row>(props.data, A2UI_LIST_LIMITS.PieChart.data).filter(
    (row) => num(row.value) !== undefined,
  );
  const { height: _height, ...rest } = common(props);
  return (
    <DonutChart
      {...rest}
      category="value"
      centerLabel={text(props.centerLabel)}
      data={rows}
      donut={props.donut !== false}
      index="label"
    />
  );
});

export const ScatterChartView = define('ScatterChart', ({ props }) => {
  const rows = rowsOf<Row>(props.data, A2UI_LIST_LIMITS.ScatterChart.data)
    .filter((row) => num(row.x) !== undefined && num(row.y) !== undefined)
    .map((row): Row => ({ ...row, series: typeof row.series === 'string' ? row.series : '' }));
  return (
    <ScatterChart
      {...common(props)}
      category="series"
      data={rows}
      label="label"
      showLegend={new Set(rows.map((row) => row.series)).size > 1}
      size={rows.some((row) => num(row.size) !== undefined) ? 'size' : undefined}
      x="x"
      xAxisLabel={text(props.xLabel)}
      y="y"
      yAxisLabel={text(props.yLabel)}
    />
  );
});

export const RadarChartView = define('RadarChart', ({ props }) => {
  const { categories, rows } = widen(props.data, A2UI_LIST_LIMITS.RadarChart.data, 'axis', 'value');
  return (
    <RadarChart
      {...common(props)}
      categories={categories}
      data={rows}
      index="__x"
      maxValue={num(props.max)}
    />
  );
});

export const HeatmapView = define('Heatmap', ({ props }) => (
  <HeatmapChart
    {...common(props)}
    data={rowsOf<Row>(props.data, A2UI_LIST_LIMITS.Heatmap.data)}
    value="value"
    x="x"
    y="y"
  />
));

export const GaugeView = define('Gauge', ({ props }) => (
  <GaugeChart
    format={formatOf(props.format)}
    label={text(props.label)}
    max={num(props.max)}
    min={num(props.min)}
    title={text(props.title)}
    value={num(props.value) ?? 0}
    variant="a2ui"
  />
));

export const TreemapView = define('Treemap', ({ props }) => (
  <TreemapChart
    {...common(props)}
    category="value"
    data={rowsOf<Row>(props.data, A2UI_LIST_LIMITS.Treemap.data)}
    group="group"
    index="name"
  />
));

export const SankeyChartView = define('SankeyChart', ({ props }) => (
  <SankeyChart
    {...common(props)}
    data={rowsOf<Row>(props.links, A2UI_LIST_LIMITS.SankeyChart.links)}
  />
));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/** An ISO date as the axis shows it, in the reader's language: "Sep 1". Anything else stays. */
const shortDate = (value: unknown, locale?: string) => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return value;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
        date,
      );
};

export const CandlestickChartView = define('CandlestickChart', ({ props }) => {
  const locale = useA2uiHost()?.locale;
  const rows = rowsOf<Row>(props.data, A2UI_LIST_LIMITS.CandlestickChart.data).map((row) => ({
    ...row,
    date: shortDate(row.date, locale),
  }));
  return <CandlestickChart {...common(props)} data={rows} index="date" />;
});

const SPARK_TONE = { default: 'default', negative: 'negative', positive: 'positive' } as const;

export const SparklineView = define('Sparkline', ({ props }) => {
  const locale = useA2uiHost()?.locale;
  const values = (Array.isArray(props.values) ? props.values : [])
    .map(Number)
    .filter(Number.isFinite)
    .slice(-A2UI_LIST_LIMITS.Sparkline.values);
  return (
    <SparkAreaChart
      categories={['v']}
      data={values.map((v, i) => ({ i, v }))}
      delta={text(props.delta)}
      index="i"
      label={text(props.label)}
      tone={SPARK_TONE[props.tone as keyof typeof SPARK_TONE]}
      value={text(props.value) ?? (values.length > 0 ? values.at(-1)!.toLocaleString(locale) : '')}
      variant="a2ui"
    />
  );
});
