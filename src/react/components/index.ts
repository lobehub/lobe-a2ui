import {
  createBasicCatalogFunctions,
  createFunctionImplementation,
  OpenUrlApi,
} from '@a2ui/web_core/v1_0';

import { isHttpsUrl } from '../../url';
import { ChartView } from './chart';
import {
  AudioPlayerView,
  BarsView,
  CalloutView,
  ImageView,
  ItemsView,
  KeyValueView,
  MetricsView,
  ProgressView,
  StepsView,
  TableView,
  TagView,
  TextView,
  VideoView,
} from './content';
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
  ColumnView,
  DividerView,
  GridView,
  ListView,
  ModalView,
  RowView,
  TabsView,
} from './layout';

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
  // LobeHub extensions
  TagView,
  MetricsView,
  CalloutView,
  ItemsView,
  BarsView,
  ChartView,
  TableView,
  KeyValueView,
  ProgressView,
  StepsView,
  GridView,
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
