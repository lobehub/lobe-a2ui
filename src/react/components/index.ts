import {
  createBasicCatalogFunctions,
  createFunctionImplementation,
  OpenUrlApi,
} from '@a2ui/web_core/v1_0';

import { isHttpsUrl } from '../../url';
import { ChartView } from './chart';
import {
  AreaChartView,
  BarChartView,
  CandlestickChartView,
  GaugeView,
  HeatmapView,
  LineChartView,
  LocationCardView,
  MapViewView,
  PieChartView,
  PlaceListView,
  RadarChartView,
  RouteMapView,
  SankeyChartView,
  ScatterChartView,
  SparklineView,
  StockTickerView,
  TreemapView,
} from './charts';
import {
  AudioPlayerView,
  CodeView,
  ImageView,
  KeyValueView,
  MetricsView,
  StatisticView,
  StepsView,
  TableView,
  TagView,
  TextView,
  VideoView,
} from './content';
import {
  AccordionView,
  AgendaView,
  AlertView,
  AvatarGroupView,
  AvatarView,
  BadgeView,
  CalloutView,
  CodeBlockView,
  ComparisonTableView,
  DataTableView,
  EmptyStateView,
  EventCardView,
  ImageGalleryView,
  ImageGridView,
  KeyValueListView,
  MathView,
  ProfileCardView,
  ReceiptCardView,
  RecipeCardView,
  ProgressView,
  RadialProgressView,
  RatingView,
  SectionView,
  StatGroupView,
  StatView,
  TagListView,
  TimelineView,
  VideoEmbedView,
  WeatherCardView,
} from './data';
import { IconView } from './icon';
import {
  ButtonView,
  CheckBoxView,
  ChoicePickerView,
  DateTimeInputView,
  SliderView,
  TextFieldView,
} from './input';
import {
  CardView,
  CollapseView,
  ColumnView,
  DividerView,
  GridView,
  ListView,
  ModalView,
  RowView,
  TabsView,
} from './layout';
import {
  CaptionView,
  HeadingView,
  KbdView,
  LinkCardView,
  LinkView,
  MarkdownView,
  QuoteView,
  TitleView,
} from './official';

export { A2uiIcon, type A2uiIconProps } from './icon';

/** The @lobehub/ui implementation of every component in the catalog, basic and LobeHub's. */
export const LOBE_COMPONENTS = [
  // A2UI basic catalog
  TextView,
  ImageView,
  IconView,
  VideoView,
  AudioPlayerView,
  RowView,
  ColumnView,
  ListView,
  CardView,
  TabsView,
  ModalView,
  DividerView,
  ButtonView,
  TextFieldView,
  CheckBoxView,
  ChoicePickerView,
  SliderView,
  DateTimeInputView,
  // LobeHub extensions, after the official A2UI playground
  GridView,
  HeadingView,
  SectionView,
  TitleView,
  CaptionView,
  MarkdownView,
  QuoteView,
  KbdView,
  LinkView,
  LinkCardView,
  RatingView,
  AvatarGroupView,
  ComparisonTableView,
  EmptyStateView,
  LineChartView,
  AreaChartView,
  BarChartView,
  PieChartView,
  ScatterChartView,
  RadarChartView,
  HeatmapView,
  GaugeView,
  TreemapView,
  SankeyChartView,
  CandlestickChartView,
  SparklineView,
  StockTickerView,
  MapViewView,
  LocationCardView,
  PlaceListView,
  RouteMapView,
  StatView,
  StatGroupView,
  DataTableView,
  KeyValueListView,
  TimelineView,
  AgendaView,
  ProgressView,
  RadialProgressView,
  TagListView,
  BadgeView,
  AvatarView,
  AlertView,
  CalloutView,
  CodeBlockView,
  AccordionView,
  WeatherCardView,
  ProfileCardView,
  ReceiptCardView,
  EventCardView,
  RecipeCardView,
  ImageGalleryView,
  ImageGridView,
  VideoEmbedView,
  MathView,
  // Retired 1.x components, kept so stored cards replay
  StatisticView,
  TableView,
  KeyValueView,
  StepsView,
  TagView,
  CodeView,
  CollapseView,
  MetricsView,
  ChartView,
];

/**
 * `openUrl` as the implementation guide asks, stricter on scheme: https only (http too would let
 * a card send someone to an unencrypted page), opened in a new tab without an opener.
 */
const SafeOpenUrl = createFunctionImplementation(OpenUrlApi as never, (args: { url?: unknown }) => {
  const url = typeof args.url === 'string' ? new URL(args.url, globalThis.location?.href).href : '';
  if (!isHttpsUrl(url))
    throw new Error(`openUrl only opens https links, not "${String(args.url)}"`);
  globalThis.open?.(url, '_blank', 'noopener,noreferrer');
});

/** The basic catalog's functions (web_core's implementations), with the https-only openUrl. */
export const createLobeFunctions = (locale?: string) =>
  createBasicCatalogFunctions({ locale }).map((fn) =>
    (fn as { name?: string }).name === 'openUrl' ? SafeOpenUrl : fn,
  );
