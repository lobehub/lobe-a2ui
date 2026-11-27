import {
  AreaChart,
  BarChart,
  CandlestickChart,
  DonutChart,
  GaugeChart,
  HeatmapChart,
  LineChart,
  LocationCard,
  MapView,
  PlaceList,
  RadarChart,
  SankeyChart,
  RouteMap,
  ScatterChart,
  SparkAreaChart,
  StockTicker,
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

// --- Stock ticker and maps (MapLibre on OpenFreeMap tiles, no key; maplibre-gl loads lazily) ---

const num2 = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const BASEMAPS = new Set(['liberty', 'bright', 'positron', 'dark', 'fiord']);
/** The official schema names CARTO-era basemaps; ours are OpenFreeMap's, `auto` follows the theme. */
const basemapOf = (value: unknown) =>
  value === 'streets' ? 'liberty' : BASEMAPS.has(value as string) ? (value as never) : undefined;

export const StockTickerView = define('StockTicker', ({ props }) => {
  const locale = useA2uiHost()?.locale;
  return (
    <StockTicker
      change={num2(props.change)}
      changePct={num2(props.changePct)}
      currency={text(props.currency)}
      locale={locale}
      name={text(props.name)}
      price={num2(props.price) ?? 0}
      sample={props.sample === true}
      symbol={text(props.symbol) ?? ''}
      variant="a2ui"
      series={(Array.isArray(props.series) ? props.series : [])
        .map(Number)
        .filter(Number.isFinite)
        .slice(-A2UI_LIST_LIMITS.StockTicker.series)}
      stats={rowsOf<Row>(props.stats, 12).map((stat) => ({
        label: String(stat.label ?? ''),
        value: String(stat.value ?? ''),
      }))}
    />
  );
});

const pointsOf = (value: unknown, max: number) =>
  rowsOf<Row>(value, max)
    .filter((point) => num2(point.lat) !== undefined && num2(point.lon) !== undefined)
    .map((point) => ({
      ...point,
      lat: point.lat as number,
      lon: point.lon as number,
      name: String(point.name ?? ''),
    }));

export const MapViewView = define('MapView', ({ props }) => (
  <MapView
    height={num2(props.height)}
    markers={pointsOf(props.markers, A2UI_LIST_LIMITS.MapView.markers) as never}
    title={text(props.title)}
    variant="a2ui"
    zoom={num2(props.zoom)}
  />
));

export const LocationCardView = define('LocationCard', ({ props }) => {
  const lat = num2(props.lat);
  const lon = num2(props.lon);
  if (lat === undefined || lon === undefined) return null;
  return (
    <LocationCard
      address={text(props.address)}
      category={text(props.category)}
      hours={text(props.hours)}
      lat={lat}
      lon={lon}
      name={text(props.name) ?? ''}
      rating={num2(props.rating)}
      variant="a2ui"
    />
  );
});

export const PlaceListView = define('PlaceList', ({ props }) => (
  <PlaceList
    basemap={basemapOf(props.basemap)}
    height={num2(props.height)}
    places={pointsOf(props.places, A2UI_LIST_LIMITS.PlaceList.places) as never}
    selected={num2(props.selected)}
    source={text(props.source)}
    title={text(props.title)}
    variant="a2ui"
  />
));

export const RouteMapView = define('RouteMap', ({ props }) => {
  const coordinates = (Array.isArray(props.coordinates) ? props.coordinates : [])
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) && num2(point[0]) !== undefined && num2(point[1]) !== undefined,
    )
    .slice(0, A2UI_LIST_LIMITS.RouteMap.coordinates);
  return (
    <RouteMap
      coordinates={coordinates}
      distance={text(props.distance)}
      duration={text(props.duration)}
      from={text(props.from) ?? ''}
      height={num2(props.height)}
      title={text(props.title)}
      to={text(props.to) ?? ''}
      variant="a2ui"
    />
  );
});
