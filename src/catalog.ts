import {
  ButtonApi,
  CheckBoxApi,
  ChoicePickerApi,
  ColumnApi,
  CommonSchemas,
  DividerApi,
  ImageApi,
  RowApi,
  SliderApi,
  TextApi,
  TextFieldApi,
} from '@a2ui/web_core/v1_0';
import { z } from 'zod';

/**
 * LobeHub's A2UI catalog: what an Agent may draw in a conversation.
 *
 * Basic components keep the official A2UI 1.0 names and schemas, so an Agent that knows A2UI draws
 * with them unchanged; each client maps them onto @lobehub/ui. The extensions below are ours, for
 * what conversations need and the basic catalog lacks: metrics, callouts, status lists and bars.
 * Media beyond images, modals, tabs and free-form inputs are left out until a surface needs them.
 */
export const A2UI_CATALOG_ID = 'https://lobehub.com/a2ui/catalog/v1';
export const A2UI_VERSION = '1.0';

/**
 * The outer card. Official `Card` takes only `child`; ours adds a header, drawn by the
 * @lobehub/ui `Surface` heading, so a card's title, description and badge look like every other
 * card in the product instead of being assembled from Text.
 */
export const CardApi = {
  name: 'Card',
  schema: z.object({
    badge: CommonSchemas.ComponentId.optional().describe(
      'Child shown at the header end, e.g. a Tag',
    ),
    child: CommonSchemas.ComponentId.describe('The card body'),
    description: CommonSchemas.DynamicString.optional().describe('One line under the title'),
    title: CommonSchemas.DynamicString.optional().describe('Card heading'),
  }),
};

const Tone = z.enum(['good', 'bad', 'warn', 'neutral']);

/** Peer figures in one strip (@lobehub/ui MetricStrip). */
export const MetricsApi = {
  name: 'Metrics',
  schema: z.object({
    items: CommonSchemas.DynamicValue.describe(
      'Array of { label, value, delta?, direction?: "up"|"down"|"flat", tone?: "good"|"bad"|"warn"|"neutral", hint? }. ' +
        'value is the figure as a string ("667", "1.01s"); delta the change ("+62%", "424 → 667"); ' +
        'tone says whether the change is good or bad, which colours the delta.',
    ),
    variant: z.enum(['joined', 'split']).optional().describe('joined: one strip (default)'),
  }),
};

/** Something a person must notice: an incident, a blocker, a confirmation. */
export const CalloutApi = {
  name: 'Callout',
  schema: z.object({
    body: CommonSchemas.DynamicString.optional().describe('Markdown'),
    level: z.enum(['error', 'warning', 'info', 'success']),
    title: CommonSchemas.DynamicString,
  }),
};

export const ITEM_STATUSES = ['new', 'worse', 'human', 'blocked', 'watch', 'done'] as const;

/** A titled list where every row has a status, a short title and its detail. */
export const ItemsApi = {
  name: 'Items',
  schema: z.object({
    items: CommonSchemas.DynamicValue.describe(
      `Array of { status: ${ITEM_STATUSES.map((s) => `"${s}"`).join('|')}, title (markdown, one line), detail? }`,
    ),
    title: CommonSchemas.DynamicString,
  }),
};

/** A short series as bars, with chosen points marked. */
export const BarsApi = {
  name: 'Bars',
  schema: z.object({
    caption: CommonSchemas.DynamicString.optional(),
    labels: CommonSchemas.DynamicValue.optional().describe('Axis labels, evenly spread'),
    marks: CommonSchemas.DynamicValue.optional().describe('{ "<index>": "bad"|"warn"|"good" }'),
    title: CommonSchemas.DynamicString,
    unit: CommonSchemas.DynamicString.optional(),
    values: CommonSchemas.DynamicValue.describe('Array of numbers'),
  }),
};

/**
 * A real chart (@lobehub/charts): series over time, a comparison, or a share of a whole.
 * `data` is rows of plain values; `index` names the row field on the axis (or the slice name),
 * `categories` the numeric fields drawn as series (a donut or bar list draws the first).
 */
export const ChartApi = {
  name: 'Chart',
  schema: z.object({
    categories: CommonSchemas.DynamicStringList.describe('Numeric fields of each row to draw'),
    data: CommonSchemas.DynamicValue.describe('Array of row objects, at most 200'),
    index: CommonSchemas.DynamicString.describe(
      'Row field for the x axis, or the slice / bar name',
    ),
    title: CommonSchemas.DynamicString.optional(),
    type: z.enum(['line', 'area', 'bar', 'donut', 'barList']),
    unit: CommonSchemas.DynamicString.optional().describe('Appended to every value, e.g. "ms"'),
  }),
};

export const TagApi = {
  name: 'Tag',
  schema: z.object({
    color: z.enum(['default', 'success', 'warning', 'error', 'info']).optional(),
    text: CommonSchemas.DynamicString,
  }),
};

export { Tone as MetricToneSchema };

/** Every component, in the order the system prompt lists them. */
export const A2UI_COMPONENT_APIS = [
  CardApi,
  ColumnApi,
  RowApi,
  TextApi,
  DividerApi,
  ButtonApi,
  TagApi,
  MetricsApi,
  CalloutApi,
  ItemsApi,
  BarsApi,
  ChartApi,
  ImageApi,
  TextFieldApi,
  CheckBoxApi,
  ChoicePickerApi,
  SliderApi,
] as const;

export const A2UI_COMPONENT_NAMES: ReadonlySet<string> = new Set(
  A2UI_COMPONENT_APIS.map((api) => api.name),
);
