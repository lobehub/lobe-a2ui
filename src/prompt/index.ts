import { A2UI_CATALOG_DOCUMENT, A2UI_CATALOG_ID, type CatalogDocument } from '../catalog';
import agentToRenderer from '../schema/agent_to_renderer.json';
import commonTypes from '../schema/common_types.json';
import dailyReport from './examples/daily-report.json';
import financialDataGrid from './examples/financial-data-grid.json';
import flightStatus from './examples/flight-status.json';
import planCompare from './examples/plan-compare.json';
import recipeCard from './examples/recipe-card.json';
import softwarePurchase from './examples/software-purchase.json';
import tripDay from './examples/trip-day.json';

/**
 * The A2UI prompt, ported from the official Direct JSON prompt generator
 * (google/A2UI `python/a2ui_agent/src/a2ui/inference_formats/direct_json`): format rules, then
 * the protocol and catalog JSON schemas between the schema block lines, then few-shot examples.
 * Everything a model learns about components comes from the catalog schema; nothing here patches
 * a component's description.
 */

type Json = Record<string, unknown>;

export interface A2uiPromptExample {
  description?: string;
  messages: Json[];
  name: string;
}

/** Varied surfaces: official basic-catalog examples and LobeHub ones that use the extensions. */
export const A2UI_PROMPT_EXAMPLES: A2uiPromptExample[] = [
  dailyReport,
  planCompare,
  tripDay,
  flightStatus,
  recipeCard,
  financialDataGrid,
  softwarePurchase,
] as A2uiPromptExample[];

/** The messages an Agent sends to draw one card. */
export const A2UI_PROMPT_MESSAGES = [
  'CreateSurfaceMessage',
  'UpdateComponentsMessage',
  'UpdateDataModelMessage',
] as const;

export const A2UI_SCHEMA_BLOCK_START = '---BEGIN A2UI JSON SCHEMA---';
export const A2UI_SCHEMA_BLOCK_END = '---END A2UI JSON SCHEMA---';

/** The official workflow rules, for delivery through a tool argument instead of tags. */
export const A2UI_WORKFLOW_RULES = `The generated UI MUST follow these rules:
- Send the UI as the \`operations\` argument of the renderUI tool: a JSON array of A2UI messages, each following the provided A2UI JSON SCHEMA. One call draws one surface; every message names the same surfaceId.
- Use "${A2UI_CATALOG_ID}" as the createSurface catalogId.
- Top-Down Component Ordering: Within the \`components\` list of a message:
    - The 'root' component MUST be the FIRST element.
    - Parent components MUST appear before their child components.
    This specific ordering allows the streaming parser to yield and render the UI incrementally as it arrives.`;

const DEFS_REF = '#/$defs/';

const collectRefs = (node: unknown, refs = new Set<string>()) => {
  if (Array.isArray(node)) for (const item of node) collectRefs(item, refs);
  else if (node && typeof node === 'object')
    for (const [key, value] of Object.entries(node))
      if (key === '$ref' && typeof value === 'string') refs.add(value);
      else collectRefs(value, refs);
  return refs;
};

/** The definitions reachable from `roots`, in their original order. */
const reachableDefs = (defs: Json, roots: Iterable<string>) => {
  const reachable = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (!(name in defs) || reachable.has(name)) continue;
    reachable.add(name);
    for (const ref of collectRefs(defs[name]))
      if (ref.startsWith(DEFS_REF)) queue.push(ref.slice(DEFS_REF.length));
  }
  return Object.fromEntries(Object.entries(defs).filter(([name]) => reachable.has(name)));
};

/** `prune_messages_schema`: an agent-to-renderer schema that admits only `allowed` messages. */
export const pruneMessagesSchema = (schema: Json, allowed: readonly string[]): Json => {
  const defs = (schema.$defs ?? {}) as Record<string, Json>;
  const allowedDefs = new Set(allowed);
  for (const [name, def] of Object.entries(defs)) {
    const props = def?.properties as Json | undefined;
    if (props && Object.keys(props).some((key) => allowedDefs.has(key))) allowedDefs.add(name);
  }
  return {
    ...schema,
    $defs: reachableDefs(defs, allowedDefs),
    oneOf: ((schema.oneOf ?? []) as Json[]).filter(
      (item) =>
        typeof item.$ref === 'string' &&
        item.$ref.startsWith(DEFS_REF) &&
        allowedDefs.has(item.$ref.slice(DEFS_REF.length)),
    ),
  };
};

/** `prune_common_types_schema`: the common types the given schemas use, and what those use. */
export const pruneCommonTypesSchema = (schema: Json, ...referencing: unknown[]): Json => {
  const roots = new Set<string>();
  for (const node of referencing)
    for (const ref of collectRefs(node))
      if (ref.includes(`common_types.json${DEFS_REF}`) || ref.startsWith(DEFS_REF))
        roots.add(ref.split(DEFS_REF).at(-1)!);
  return { ...schema, $defs: reachableDefs((schema.$defs ?? {}) as Json, roots) };
};

/** A catalog with only `components` (and the unions rebuilt to match). */
export const pruneCatalogComponents = (
  catalog: CatalogDocument,
  components: readonly string[],
): CatalogDocument => {
  const kept = Object.fromEntries(
    Object.entries(catalog.components).filter(([name]) => components.includes(name)),
  );
  return {
    ...catalog,
    $defs: {
      ...catalog.$defs,
      anyComponent: {
        discriminator: { propertyName: 'component' },
        oneOf: Object.keys(kept).map((name) => ({ $ref: `#/components/${name}` })),
      },
    },
    components: kept,
  };
};

const compact = (value: unknown) => JSON.stringify(value);

/** An example's messages on LobeHub's catalog, as the rules ask the model to write them. */
const onCatalog = (messages: Json[]) =>
  messages.map((message) => {
    const create = message.createSurface as Json | undefined;
    return create
      ? { ...message, createSurface: { ...create, catalogId: A2UI_CATALOG_ID } }
      : message;
  });

/**
 * How to shape a surface, on top of the schema: the layout follows the content. Hosts add their
 * own rules (when to draw at all, buttons, tone) through `guidance`.
 */
export const A2UI_LAYOUT_GUIDANCE = `### Designing the surface
- Design the layout for this content; there is no fixed template and no required section order. Any component can be the root: a Card with a header, a Column, a Row, a Grid, Tabs or a List. The product frames the root in its card surface, so don't nest a Card just to get a border.
- Pick each component for the shape of what it shows, and include only the parts the content has:
  comparing options across attributes → Table (one row per option), or a Grid of Cards when each option needs its own words;
  plan, schedule, itinerary, timeline → Steps (times in meta); a dense timetable → Table;
  facts about one thing (profile, spec, order) → KeyValue, or Image/Icon + Text in a Row;
  quota, goal, completion → Progress; headline figures → Metrics (one item for a single key number);
  trend → Chart line/area; share → Chart donut; ranking → Chart barList; daily activity → Chart heatmap; uptime → Chart tracker;
  verdict or incident → Callout, or a Tag as the Card badge; findings with a status → Items;
  media → Image, Video, AudioPlayer; several views of one subject → Tabs; secondary detail → Modal;
  people, links, results → List or Column of Rows (Icon or Image + Text); input → TextField, CheckBox, ChoicePicker, Slider, DateTimeInput with a Button.
- Say the conclusion first: in the Card title or badge, or the first Text.
- Icons: basic names, or set "lucide" (any Lucide name), "simple" (brand logos by slug) and "lobehub" (AI providers and models).
- Text is markdown: "#### " starts a heading; use formatString, formatNumber, formatCurrency, formatDate and pluralize instead of building strings by hand.
- Media and links must be https. Show only figures you were given or measured; say so on the surface when something is an estimate or an example.`;

export interface BuildA2uiPromptOptions {
  /** Components to describe; defaults to the whole catalog. */
  components?: readonly string[];
  /** Few-shot examples; `false` for none. Defaults to `A2UI_PROMPT_EXAMPLES`. */
  examples?: A2uiPromptExample[] | false;
  /** Text after the examples. Defaults to `A2UI_LAYOUT_GUIDANCE`; hosts usually append their own rules. */
  guidance?: string;
}

/**
 * The system prompt that teaches a model to draw A2UI surfaces on LobeHub's catalog: the workflow
 * rules, the schema block (agent-to-renderer schema pruned to the drawing messages, the common
 * types the catalog and those messages use, and the catalog schema), then the examples.
 */
export const buildA2uiPrompt = (options: BuildA2uiPromptOptions = {}): string => {
  const catalog = options.components
    ? pruneCatalogComponents(A2UI_CATALOG_DOCUMENT, options.components)
    : A2UI_CATALOG_DOCUMENT;
  const messages = pruneMessagesSchema(agentToRenderer as Json, A2UI_PROMPT_MESSAGES);
  const common = pruneCommonTypesSchema(commonTypes as Json, catalog, messages);

  const schema = [
    A2UI_SCHEMA_BLOCK_START,
    `### Agent to Renderer Schema:\n${compact(messages)}`,
    `### Common Types Schema:\n${compact(common)}`,
    `### Catalog Schema:\n${compact(catalog)}`,
    A2UI_SCHEMA_BLOCK_END,
  ].join('\n\n');

  const examples = options.examples === false ? [] : (options.examples ?? A2UI_PROMPT_EXAMPLES);
  const exampleBlock =
    examples.length > 0
      ? [
          '### Examples',
          'Each is the renderUI `operations` for a differently shaped surface. Learn the vocabulary from them; never copy their layout.',
          ...examples.map(
            (example, index) =>
              `Example ${index + 1}: ${example.name}${example.description ? ` — ${example.description}` : ''}\n${compact(onCatalog(example.messages))}`,
          ),
        ].join('\n\n')
      : '';

  return [A2UI_WORKFLOW_RULES, schema, exampleBlock, options.guidance ?? A2UI_LAYOUT_GUIDANCE]
    .filter(Boolean)
    .join('\n\n');
};
