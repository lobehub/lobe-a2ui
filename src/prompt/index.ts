import {
  A2UI_AUTHORING_CATALOG_DOCUMENT,
  A2UI_CATALOG_ID,
  type CatalogDocument,
} from '../catalog';
import { A2UI_EXAMPLES } from '../examples';
import type { A2uiExample } from '../examples/types';
import agentToRenderer from '../schema/agent_to_renderer.json';
import commonTypes from '../schema/common_types.json';
import { catalogIndex } from './progressive';

/**
 * The A2UI prompt, ported from the official Direct JSON prompt generator
 * (google/A2UI `python/a2ui_agent/src/a2ui/inference_formats/direct_json`): format rules, then
 * the protocol and catalog JSON schemas between the schema block lines, then few-shot examples.
 * Everything a model learns about components comes from the catalog schema; nothing here patches
 * a component's description.
 */

type Json = Record<string, unknown>;

/** @deprecated Use `A2uiExample`. */
export type A2uiPromptExample = Pick<A2uiExample, 'description' | 'messages' | 'name'>;
export { A2UI_EXAMPLES } from '../examples';
export type { A2uiExample } from '../examples/types';

/**
 * The example surfaces of the given catalogs, like the official SDK's `load_examples` reading
 * `catalogs/<name>/<version>/examples`: all of them, or only the given ids.
 */
export const loadExamples = (
  catalogs: readonly string[] = ['basic', 'lobehub'],
  ids?: readonly string[],
): A2uiExample[] =>
  catalogs
    .flatMap((catalog) => A2UI_EXAMPLES[catalog as keyof typeof A2UI_EXAMPLES] ?? [])
    .filter((example) => !ids || ids.includes(example.id));

/**
 * The examples the prompt shows by default: a varied subset, since every example costs tokens
 * (`loadExamples()` returns all 60). Official basic surfaces first, then LobeHub's, which show
 * the extension components in differently shaped cards.
 */
export const A2UI_PROMPT_EXAMPLE_IDS = [
  'flight-status',
  'recipe-card',
  'financial-data-grid',
  'user-profile',
  'software-purchase',
  'child-list-template',
  'sales-dashboard',
  'service-health',
  'plan-comparison',
  'trip-day',
  'team-profile',
  'code-answer',
  'release-pipeline',
  'signup-funnel',
  'vendor-comparison',
  'cloud-costs',
  'branch-check',
  'event-signup',
] as const;

export const A2UI_PROMPT_EXAMPLES: A2uiExample[] = loadExamples(undefined, A2UI_PROMPT_EXAMPLE_IDS);

/** The messages an Agent sends to draw one card. */
export const A2UI_PROMPT_MESSAGES = [
  'CreateSurfaceMessage',
  'UpdateComponentsMessage',
  'UpdateDataModelMessage',
] as const;

export const A2UI_SCHEMA_BLOCK_START = '---BEGIN A2UI JSON SCHEMA---';
export const A2UI_SCHEMA_BLOCK_END = '---END A2UI JSON SCHEMA---';

/**
 * How the host receives a surface: a tool whose `operations` argument carries the messages (the
 * default, `renderUI`), or a command that takes them as a JSON array.
 */
export type A2uiDelivery = { command: string } | { tool: string };

export const A2UI_DEFAULT_DELIVERY: A2uiDelivery = { tool: 'renderUI' };

const sendText = (delivery: A2uiDelivery) =>
  'tool' in delivery
    ? `the \`operations\` argument of the ${delivery.tool} tool`
    : `a JSON array passed to \`${delivery.command}\``;
const drawText = (delivery: A2uiDelivery) =>
  'tool' in delivery ? `call ${delivery.tool}` : `run \`${delivery.command}\``;

/** The official workflow rules, for delivery through a tool argument or a command, not tags. */
export const a2uiWorkflowRules = (
  delivery: A2uiDelivery = A2UI_DEFAULT_DELIVERY,
) => `The generated UI MUST follow these rules:
- Send the UI as ${sendText(delivery)}: a JSON array of A2UI messages, each following the provided A2UI JSON SCHEMA. One call draws one surface; every message names the same surfaceId.
- Use "${A2UI_CATALOG_ID}" as the createSurface catalogId.
- Top-Down Component Ordering: Within the \`components\` list of a message:
    - The 'root' component MUST be the FIRST element.
    - Parent components MUST appear before their child components.
    This specific ordering allows the streaming parser to yield and render the UI incrementally as it arrives.`;

export const A2UI_WORKFLOW_RULES = a2uiWorkflowRules();

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

/** `FunctionPruningTransformer`: a catalog with only `functions` (and `anyFunction` rebuilt). */
export const pruneCatalogFunctions = (
  catalog: CatalogDocument,
  functions: readonly string[],
): CatalogDocument => {
  const kept = Object.fromEntries(
    Object.entries(catalog.functions ?? {}).filter(([name]) => functions.includes(name)),
  );
  return {
    ...catalog,
    $defs: {
      ...catalog.$defs,
      anyFunction: { oneOf: Object.keys(kept).map((name) => ({ $ref: `#/functions/${name}` })) },
    },
    functions: kept,
  };
};

/** `ComponentPruningTransformer`: a catalog with only `components` (and the unions rebuilt). */
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

export interface BuildA2uiPromptOptions {
  /** The catalog to describe; defaults to the merged LobeHub catalog. */
  catalog?: CatalogDocument;
  /** Components to describe; defaults to the whole catalog. */
  components?: readonly string[];
  /** How the host receives a surface. Defaults to the `renderUI` tool. */
  delivery?: A2uiDelivery;
  /** Few-shot examples: a list, `'all'` for every example, or `false` for none. Defaults to `A2UI_PROMPT_EXAMPLES`. */
  examples?: A2uiPromptExample[] | 'all' | false;
  /** Text after the examples, if any. */
  guidance?: string;
}

/**
 * The system prompt that teaches a model to draw A2UI surfaces on LobeHub's catalog: the workflow
 * rules, the schema block (agent-to-renderer schema pruned to the drawing messages, the common
 * types the catalog and those messages use, and the catalog schema), then the examples.
 */
export const buildA2uiPrompt = (options: BuildA2uiPromptOptions = {}): string => {
  const base = options.catalog ?? A2UI_AUTHORING_CATALOG_DOCUMENT;
  const catalog = options.components ? pruneCatalogComponents(base, options.components) : base;
  const messages = pruneMessagesSchema(agentToRenderer as Json, A2UI_PROMPT_MESSAGES);
  const common = pruneCommonTypesSchema(commonTypes as Json, catalog, messages);

  const schema = [
    A2UI_SCHEMA_BLOCK_START,
    `### Agent to Renderer Schema:\n${compact(messages)}`,
    `### Common Types Schema:\n${compact(common)}`,
    `### Catalog Schema:\n${compact(catalog)}`,
    A2UI_SCHEMA_BLOCK_END,
  ].join('\n\n');

  const examples =
    options.examples === false
      ? []
      : options.examples === 'all'
        ? loadExamples()
        : (options.examples ?? A2UI_PROMPT_EXAMPLES);
  const exampleBlock =
    examples.length > 0
      ? [
          '### Examples:',
          ...examples.map(
            (example, index) =>
              `Example ${index + 1}: ${example.name}${example.description ? ` — ${example.description}` : ''}\n${compact(onCatalog(example.messages))}`,
          ),
        ].join('\n\n')
      : '';

  return [a2uiWorkflowRules(options.delivery), schema, exampleBlock, options.guidance]
    .filter(Boolean)
    .join('\n\n');
};

/**
 * The product layer on top of the A2UI prompt: when a card helps, then the official A2UI
 * playground's design rules (CopilotKit, MIT), without the parts for components this catalog does
 * not have (maps, domain cards), plus LobeHub's rules on links, buttons and figures.
 */
export const a2uiProductRules = (delivery: A2uiDelivery = A2UI_DEFAULT_DELIVERY) =>
  `You can answer with a card instead of, or next to, text: ${drawText(delivery)} with A2UI messages for one surface. Use one for information a person takes in at a glance, or to ask for several inputs at once; not for prose a few sentences answer.

### Design rules
- Fully answer the request. Lead with a Heading, then the component built for the job: comparisons -> ComparisonTable, schedules -> Agenda or Timeline, code -> CodeBlock, people -> Avatar or AvatarGroup, statuses -> Badge, ratings -> Rating, a single ratio or score -> RadialProgress or Gauge. Pick the richest component that fits: charts for numbers over time or comparisons, DataTable for many rows, Timeline for sequences.
- Lay out with Column, Row and Grid. Use Card only for an interactive panel (a form, controls) or for one thing with its own page (give it an openUrl action), and Section to group with a title. Short text is Text, Title or Caption; prose is Markdown.
- Lists of things (branches, tickets, files, people, places, steps to take) are a List of ListItem rows (label, value, description, icon), an EntityCard per thing, or a DataTable, never Markdown bullets; Markdown lists are only for prose.
- Questions and settings are a Form of inputs (Select, RadioGroup, SegmentedControl, ChipSelect, Switch, TextField, TextArea, DatePicker). End with a FollowUp of two to four short next prompts when there is a natural next step. Put a Citation right after the sentence a source supports.
- Places are MapView (at most 8 markers, each a specific named place with lat/lon), LocationCard for one place, PlaceList for a ranked list, RouteMap for a route; never use the city itself as a marker.
- One chart per question unless asked for more; never two charts, or a chart and a table, of the same numbers; never a chart whose series is flat or has under 3 points (use a Stat).
- Put KPIs in a Grid of Stat (a Sparkline when the trend matters). Aim for 8 to 18 components, never more than 20: show each fact once, prefer one rich component over many small ones, and use small ones (Badge, Avatar, Divider) where they carry meaning.
- Multi-series charts share one axis: combine only series of similar size. Percent values are 0-100 (12.4 means 12.4%) with format "percent", never fractions. Stat values are short numbers; put takeaways in KeyValueList, Callout or Markdown.
- Subtitles describe the content ("Revenue grew 12% on EMEA renewals"), never the UI itself.
- Link what has its own page: [label](https://…) in Text, a Link, a LinkCard, or an openUrl action on its Card.
- A display card needs no buttons: add one only for a real next step you can carry out when it is clicked.
- Show only figures you were given or measured; when they are illustrative, end with a Caption saying so.
- Write final copy: never "placeholder", "sample text" or "lorem", and no em dashes.`;

/** How the model reads a component's full schema and examples: a tool, or a command. */
export type A2uiDocsAccess = { command: string } | { tool: string };

export const A2UI_DEFAULT_DOCS_ACCESS: A2uiDocsAccess = { tool: 'readCardDocs' };

const docsText = (access: A2uiDocsAccess) =>
  'tool' in access
    ? `call ${access.tool} with the component names`
    : `run \`${access.command} <Name,Name>\``;

/** The examples the progressive prompt always shows: one official card, one with extensions. */
export const A2UI_INDEX_EXAMPLE_IDS = ['stats-card', 'weekly-trend'] as const;

const exampleBlock = (examples: readonly A2uiPromptExample[]) =>
  examples.length > 0
    ? [
        '### Examples:',
        ...examples.map(
          (example, index) =>
            `Example ${index + 1}: ${example.name}${example.description ? ` — ${example.description}` : ''}\n${compact(onCatalog(example.messages))}`,
        ),
      ].join('\n\n')
    : '';

export interface BuildA2uiIndexPromptOptions {
  catalog?: CatalogDocument;
  delivery?: A2uiDelivery;
  /** How the model reads full component docs. Defaults to the `readCardDocs` tool. */
  docs?: A2uiDocsAccess;
  /** Examples shown up front. Defaults to `A2UI_INDEX_EXAMPLE_IDS`. */
  examples?: A2uiPromptExample[] | false;
}

/**
 * The progressive prompt: the workflow rules, one line per component and function derived from
 * the catalog schema, and two short examples. The full schema and examples of a component are
 * read on demand (`buildA2uiDocs`), so the always-on prompt stays well under the official one.
 */
export const buildA2uiIndexPrompt = (options: BuildA2uiIndexPromptOptions = {}): string => {
  const catalog = options.catalog ?? A2UI_AUTHORING_CATALOG_DOCUMENT;
  const examples =
    options.examples === false
      ? []
      : (options.examples ?? loadExamples(undefined, A2UI_INDEX_EXAMPLE_IDS));
  const docs = options.docs ?? A2UI_DEFAULT_DOCS_ACCESS;
  return [
    // No schema block here: messages follow the format below, and full schemas come on demand.
    a2uiWorkflowRules(options.delivery).replace(
      'each following the provided A2UI JSON SCHEMA',
      'in the A2UI 1.0 format below',
    ),
    `- Messages are createSurface {surfaceId, catalogId}, updateComponents {surfaceId, components}, and optionally updateDataModel {surfaceId, path?, value}; each also has "version": "1.0". A component is {"id", "component": Name, ...props}; exactly one has id "root". Any prop may also bind to the data model with {"@path": "/key"}.
- The lines below are an index. Before using a component whose props you are unsure of, ${docsText(docs)} to read its full schema and examples. An invalid card comes back with the errors and the schemas of the components involved.`,
    catalogIndex(catalog),
    exampleBlock(examples),
  ]
    .filter(Boolean)
    .join('\n\n');
};

const componentsOfExample = (example: A2uiExample) =>
  new Set(
    example.messages.flatMap((message) => {
      const update = (message.updateComponents ?? message.createSurface) as
        { components?: { component?: unknown }[] } | undefined;
      return (update?.components ?? []).map((component) => String(component.component));
    }),
  );

export interface BuildA2uiDocsOptions {
  catalog?: CatalogDocument;
  /** Examples to choose from; defaults to every example. */
  examples?: readonly A2uiExample[];
  /** At most this many examples, the smallest that use the asked components. Default 2. */
  maxExamples?: number;
}

/**
 * The full docs of some components and functions: their catalog schema (with the common types
 * they use) and the smallest examples that use them. Unknown names are listed, not thrown.
 */
export const buildA2uiDocs = (
  names: readonly string[],
  options: BuildA2uiDocsOptions = {},
): string => {
  const base = options.catalog ?? A2UI_AUTHORING_CATALOG_DOCUMENT;
  const wanted = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const components = wanted.filter((name) => name in base.components);
  const functions = wanted.filter((name) => name in (base.functions ?? {}));
  const unknown = wanted.filter((name) => !components.includes(name) && !functions.includes(name));

  const catalog = pruneCatalogFunctions(pruneCatalogComponents(base, components), functions);
  const common = pruneCommonTypesSchema(commonTypes as Json, catalog);
  const max = options.maxExamples ?? 2;
  const pool = [...(options.examples ?? loadExamples())].sort(
    (a, b) => compact(a.messages).length - compact(b.messages).length,
  );
  const chosen: A2uiExample[] = [];
  for (const name of components) {
    if (chosen.length >= max) break;
    if (chosen.some((example) => componentsOfExample(example).has(name))) continue;
    const example = pool.find((candidate) => componentsOfExample(candidate).has(name));
    if (example) chosen.push(example);
  }

  return [
    unknown.length > 0
      ? `Not in the catalog: ${unknown.join(', ')}. Pick names from the component and function index.`
      : '',
    components.length + functions.length > 0
      ? [
          A2UI_SCHEMA_BLOCK_START,
          `### Common Types Schema:\n${compact(common)}`,
          `### Catalog Schema (${[...components, ...functions].join(', ')}):\n${compact({
            components: catalog.components,
            functions: catalog.functions,
            ...(catalog.$defs?.Weight ? { $defs: { Weight: catalog.$defs.Weight } } : {}),
          })}`,
          A2UI_SCHEMA_BLOCK_END,
        ].join('\n\n')
      : '',
    exampleBlock(chosen),
  ]
    .filter(Boolean)
    .join('\n\n');
};
export { catalogIndex, componentSignature, functionSignature } from './progressive';
