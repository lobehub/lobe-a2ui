import {
  AreaChart,
  BarChart,
  BarList,
  CategoryBar,
  DonutChart,
  FunnelChart,
  Heatmaps,
  Legend,
  LineChart,
  RadarChart,
  ScatterChart,
  SparkAreaChart,
  SparkBarChart,
  SparkLineChart,
  Tracker,
} from '@lobehub/charts';
import { cssVar, Flexbox, Text, useThemeMode } from '@lobehub/ui';
import type { ReactNode } from 'react';

import { A2UI_LIST_LIMITS } from '../../constants';
import { useA2uiHost } from '../host';
import { define, rowsOf } from './shared';

const SERIES_CHARTS = { area: AreaChart, bar: BarChart, line: LineChart } as const;
const SPARK_CHARTS = {
  sparkArea: SparkAreaChart,
  sparkBar: SparkBarChart,
  sparkLine: SparkLineChart,
};
/** Chat-width cards: tall enough to read a trend, short enough not to crowd the reply. */
const CHART_HEIGHT = 180;
const MAX_SERIES = 4;

/**
 * Series colours in a fixed order, a step per theme: blue, orange, aqua, yellow. Checked for
 * colour-blind separation between neighbours; quieter than the antd preset the charts default to.
 */
const SERIES_COLORS = {
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500'],
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
};

const TRACKER_COLOR: Record<string, string> = {
  bad: cssVar.colorError,
  good: cssVar.colorSuccess,
  neutral: cssVar.colorFillSecondary,
  warn: cssVar.colorWarning,
};

type Row = Record<string, unknown>;

/** Month names in the reader's language: the heatmap's only words besides the Agent's. */
const monthNames = (locale: string | undefined) =>
  Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(Date.UTC(2024, month, 15))),
  );

const drawChart = (
  locale: string | undefined,
  type: string,
  rows: Row[],
  index: string,
  categories: string[],
  format: (value: number) => string,
  colors: string[],
): ReactNode => {
  const first = categories[0];
  const named = () =>
    rows.map((row) => ({ name: String(row[index] ?? ''), value: Number(row[first] ?? 0) }));

  switch (type) {
    case 'donut': {
      // A donut names its slices beside it; without the legend the colours mean nothing.
      return (
        <Flexbox horizontal align="center" gap={16}>
          <DonutChart
            showLabel
            category={first}
            colors={colors}
            data={rows}
            index={index}
            style={{ flex: 'none', height: 120, width: 120 }}
            valueFormatter={format}
          />
          <Legend categories={rows.map((row) => String(row[index] ?? ''))} colors={colors} />
        </Flexbox>
      );
    }
    case 'barList': {
      return <BarList color={colors[0]} data={named()} valueFormatter={format} />;
    }
    case 'funnel': {
      return (
        <FunnelChart
          color={colors[0]}
          data={named()}
          style={{ height: CHART_HEIGHT }}
          valueFormatter={format}
        />
      );
    }
    case 'radar': {
      return (
        <RadarChart
          categories={categories}
          colors={colors}
          data={rows}
          index={index}
          showLegend={categories.length > 1}
          style={{ height: 240 }}
          valueFormatter={format}
        />
      );
    }
    case 'scatter': {
      const [x, y, size] = categories;
      return (
        <ScatterChart
          showLegend
          category={index}
          colors={colors}
          data={rows}
          size={size}
          style={{ height: CHART_HEIGHT }}
          valueFormatter={{ x: format, y: format }}
          x={x}
          y={y}
        />
      );
    }
    case 'heatmap': {
      const counts = rows.map((row) => Number(row[first] ?? 0));
      const max = Math.max(...counts, 1);
      return (
        <Heatmaps
          maxLevel={4}
          data={rows.map((row, i) => ({
            count: counts[i],
            date: String(row[index] ?? ''),
            level: Math.min(4, Math.ceil((counts[i] / max) * 4)),
          }))}
        />
      );
    }
    case 'tracker': {
      const field = first ?? 'tone';
      // Few blocks share the full width as a slim bar; many keep the narrow default blocks.
      const fill = rows.length <= 60;
      return (
        <Tracker
          blockGap={fill ? 3 : 2}
          blockHeight={fill ? 20 : 28}
          blockWidth={fill ? '100%' : 8}
          width="100%"
          data={rows.map((row) => ({
            color: TRACKER_COLOR[String(row[field] ?? 'neutral')] ?? TRACKER_COLOR.neutral,
            tooltip: String(row[index] ?? ''),
          }))}
        />
      );
    }
    case 'categoryBar': {
      return (
        <CategoryBar
          colors={colors}
          showLabels={false}
          values={rows.map((row) => Number(row[first] ?? 0))}
        />
      );
    }
    case 'sparkArea':
    case 'sparkBar':
    case 'sparkLine': {
      const Spark = SPARK_CHARTS[type];
      return (
        <Spark
          categories={categories}
          colors={colors}
          data={rows}
          index={index}
          style={{ height: 40, width: '100%' }}
        />
      );
    }
    default: {
      const Series = SERIES_CHARTS[type as keyof typeof SERIES_CHARTS] ?? LineChart;
      return (
        <Series
          categories={categories}
          colors={colors}
          data={rows}
          height={CHART_HEIGHT}
          index={index}
          showLegend={categories.length > 1}
          startEndOnly={rows.length > 12}
          valueFormatter={format}
          yAxisWidth={44}
          {...(type === 'bar' ? { barCategoryGap: '32%' } : {})}
        />
      );
    }
  }
};

/** Every chart @lobehub/charts draws, from one rows-and-fields model. */
export const ChartView = define('Chart', ({ props }) => {
  const locale = useA2uiHost()?.locale;
  const { isDarkMode } = useThemeMode();
  const rows = rowsOf<Row>(props.data, A2UI_LIST_LIMITS.Chart.data);
  const index = String(props.index ?? '');
  const categories = (Array.isArray(props.categories) ? props.categories : [])
    .map(String)
    .slice(0, props.type === 'scatter' ? 3 : MAX_SERIES);
  const unit = props.unit ? String(props.unit) : '';
  const format = (value: number) => `${value.toLocaleString()}${unit}`;
  if (rows.length === 0) return null;
  if (categories.length === 0 && props.type !== 'tracker') return null;

  // Charts side by side in a Row share its width.
  return (
    <Flexbox flex={1} gap={8} style={{ minWidth: 0 }}>
      {props.title ? <Text weight={600}>{String(props.title)}</Text> : null}
      {drawChart(
        locale,
        String(props.type),
        rows,
        index,
        categories,
        format,
        SERIES_COLORS[isDarkMode ? 'dark' : 'light'],
      )}
    </Flexbox>
  );
});
