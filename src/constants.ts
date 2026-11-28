/**
 * The catalog facts a renderer needs, kept apart from the catalog documents so drawing a card does
 * not bundle the schemas. `catalog.test.ts` checks they match the documents.
 */

/** The LobeHub catalog's id (`lobehub_catalog.json`). */
export const A2UI_CATALOG_ID = 'https://lobehub.com/a2ui/catalog/v1';

export const A2UI_VERSION = '1.0';

/**
 * Entries a bound list may carry. Literal lists are capped by the schema's `maxItems`; data the
 * list binds to with `{"@path": ...}` is checked against the same numbers.
 */
export const A2UI_LIST_LIMITS: Record<string, Record<string, number>> = {
  Accordion: { items: 20 },
  Agenda: { days: 14 },
  AreaChart: { data: 200 },
  AvatarGroup: { people: 50 },
  BarChart: { data: 200 },
  CandlestickChart: { data: 200 },
  Carousel: { children: 20 },
  Chart: { data: 200 },
  ChipSelect: { options: 30 },
  Combobox: { options: 200 },
  ComparisonTable: { rows: 20 },
  DataTable: { rows: 200 },
  EntityCard: { actions: 3 },
  FollowUp: { items: 6 },
  Grid: { children: 12 },
  Heatmap: { data: 200 },
  ImageGallery: { images: 24 },
  ImageGrid: { images: 24 },
  KeyValue: { items: 30 },
  KeyValueList: { items: 30 },
  LineChart: { data: 200 },
  List: { items: 50 },
  MapView: { markers: 20 },
  Metrics: { items: 8 },
  PieChart: { data: 20 },
  PlaceList: { places: 20 },
  RadarChart: { data: 60 },
  RadioGroup: { options: 20 },
  ReceiptCard: { items: 50 },
  RecipeCard: { ingredients: 60, steps: 60 },
  RouteMap: { coordinates: 2000 },
  SankeyChart: { links: 60 },
  ScatterChart: { data: 200 },
  SegmentedControl: { options: 8 },
  Select: { options: 100 },
  Sparkline: { values: 120 },
  StatGroup: { items: 8 },
  Steps: { items: 20 },
  StockTicker: { series: 365 },
  Table: { rows: 50 },
  TagList: { tags: 30 },
  Timeline: { items: 20 },
  Treemap: { data: 60 },
  WeatherCard: { hourly: 24, daily: 24 },
};
