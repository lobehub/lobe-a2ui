import {
  A2UI_CATALOG_DOCUMENT,
  A2UI_CATALOG_ID,
  BASIC_CATALOG_DOCUMENT,
  type CatalogDocument,
  mergeCatalogDocuments,
} from './catalog';
import type { A2uiExample } from './examples/types';
import { surfaceToText } from './fallback';
import {
  A2UI_INDEX_EXAMPLE_IDS,
  A2UI_PROMPT_EXAMPLES,
  type A2uiDelivery,
  type A2uiDocsAccess,
  a2uiProductRules,
  buildA2uiDocs,
  buildA2uiIndexPrompt,
  buildA2uiPrompt,
  loadExamples,
  pruneCatalogComponents,
  pruneCatalogFunctions,
} from './prompt';
import {
  A2UI_DOCS_TOOL_DESCRIPTION,
  A2UI_DOCS_TOOL_NAME,
  A2UI_DOCS_TOOL_PARAMETERS,
  A2UI_TOOL_DESCRIPTION,
  A2UI_TOOL_META,
  A2UI_TOOL_NAME,
  A2UI_TOOL_PARAMETERS,
  type A2uiDocsParams,
  type A2uiToolParams,
  type A2uiToolResult,
} from './tool';
import { validateSurface, type ValidateSurfaceResult } from './validate';

/** The catalogs a renderer can draw: the official basic catalog, and LobeHub's extensions on it. */
export type A2uiCatalogName = 'basic' | 'lobehub';

export interface A2uiProcessorOptions {
  /**
   * The catalogs the host's renderer supports (the negotiated "active catalogs"). Defaults to
   * both. A host that can't draw A2UI creates no processor, so its Agent gets no A2UI prompt.
   */
  catalogs?: readonly A2uiCatalogName[];
  /** How the host receives a surface: the `renderUI` tool (default) or the `lh card render` command. */
  delivery?: 'cli' | 'tool' | A2uiDelivery;
  /** Few-shot examples: a list, `'all'`, or `false`. Defaults to the curated `A2UI_PROMPT_EXAMPLES`. */
  examples?: A2uiExample[] | 'all' | false;
  /** The product layer before the A2UI prompt; `false` for none. Defaults to `a2uiProductRules`. */
  productRules?: string | false;
  /**
   * `progressive` (default): the prompt carries one line per component and two short examples, and
   * the model reads full schemas on demand through `docs` (`readCardDocs` / `lh card guide`).
   * `full`: the official prompt with every schema and the curated examples up front.
   */
  prompt?: 'full' | 'progressive';
  /** Static allowlists, like the official component and function pruning transformers. */
  prune?: { components?: readonly string[]; functions?: readonly string[] };
}

export interface A2uiProcessor {
  /** The catalog the model is told about and checked against. */
  readonly catalog: CatalogDocument;
  readonly catalogs: readonly A2uiCatalogName[];
  /** The full schema and smallest examples of the named components and functions. */
  docs: (params: A2uiDocsParams | undefined) => string;
  /** The docs tool as a host declares it (progressive prompt only needs it). */
  readonly docsTool: {
    description: string;
    name: string;
    parameters: typeof A2UI_DOCS_TOOL_PARAMETERS;
  };
  /** The examples shown, each validated against the active catalogs. */
  readonly examples: readonly A2uiExample[];
  /** Validates and summarises a tool call: the surface to store, or the errors for the model. */
  execute: (params: A2uiToolParams | undefined) => A2uiToolResult;
  /** What to append to the Agent's system instruction while the card tool is active. */
  readonly promptSnippet: string;
  /** The tool as a host declares it. */
  readonly tool: {
    description: string;
    meta: typeof A2UI_TOOL_META;
    name: string;
    parameters: typeof A2UI_TOOL_PARAMETERS;
  };
  validate: (operations: unknown) => ValidateSurfaceResult;
}

const DELIVERY: Record<'cli' | 'tool', A2uiDelivery> = {
  cli: { command: 'lh card render' },
  tool: { tool: A2UI_TOOL_NAME },
};

const DOCS: Record<'cli' | 'tool', A2uiDocsAccess> = {
  cli: { command: 'lh card guide --components' },
  tool: { tool: A2UI_DOCS_TOOL_NAME },
};

/** Component names an error list mentions, so a failed card comes back with their schemas. */
const componentsInErrors = (errors: readonly string[]) => [
  ...new Set(
    errors.flatMap((error) =>
      [...error.matchAll(/component '(\w+)'|component "(\w+)"/g)].map((m) => m[1] ?? m[2]),
    ),
  ),
];

const componentsOf = (example: A2uiExample) =>
  example.messages.flatMap((message) => {
    const update = message.updateComponents as
      { components?: { component?: unknown }[] } | undefined;
    return (update?.components ?? []).map((component) => String(component.component));
  });

/**
 * The A2UI processor for one host, after the official SDK's `A2uiRequestProcessor`: built from
 * the catalogs the host's renderer supports, it holds the prompt snippet (format rules, pruned
 * schemas and validated examples) and the tool that checks what the model drew against those same
 * catalogs. Build it once per configuration and reuse it.
 */
export const createA2uiProcessor = (options: A2uiProcessorOptions = {}): A2uiProcessor => {
  const catalogs = options.catalogs ?? ['basic', 'lobehub'];
  if (!catalogs.includes('basic'))
    throw new Error('The lobehub catalog extends the basic catalog; include "basic"');
  let catalog: CatalogDocument = catalogs.includes('lobehub')
    ? A2UI_CATALOG_DOCUMENT
    : { ...mergeCatalogDocuments(BASIC_CATALOG_DOCUMENT), catalogId: A2UI_CATALOG_ID };
  if (options.prune?.components)
    catalog = pruneCatalogComponents(catalog, options.prune.components);
  if (options.prune?.functions) catalog = pruneCatalogFunctions(catalog, options.prune.functions);

  const components: ReadonlySet<string> = new Set(Object.keys(catalog.components));
  const functions: ReadonlySet<string> = new Set(Object.keys(catalog.functions ?? {}));
  const validate = (operations: unknown) => validateSurface(operations, { components, functions });

  // Examples outside the active catalogs are dropped; the rest must validate, as the official
  // processor checks its examples when it is built.
  const progressive = (options.prompt ?? 'progressive') === 'progressive';
  const requested =
    options.examples === false
      ? []
      : options.examples === 'all'
        ? loadExamples(catalogs)
        : (options.examples ??
          (progressive ? loadExamples(catalogs, A2UI_INDEX_EXAMPLE_IDS) : A2UI_PROMPT_EXAMPLES));
  const examples = requested.filter((example) =>
    componentsOf(example).every((name) => components.has(name)),
  );
  for (const example of examples) {
    const result = validate(example.messages);
    if (!result.ok)
      throw new Error(`A2UI example "${example.id}" is invalid: ${result.errors.join('; ')}`);
  }

  const delivery =
    typeof options.delivery === 'string' || options.delivery === undefined
      ? DELIVERY[options.delivery ?? 'tool']
      : options.delivery;
  const docsAccess =
    typeof options.delivery === 'string' || options.delivery === undefined
      ? DOCS[options.delivery ?? 'tool']
      : 'command' in options.delivery
        ? DOCS.cli
        : DOCS.tool;
  // Every example of the active catalogs, for docs to pick the smallest that use a component.
  const docsExamples = loadExamples(catalogs).filter((example) =>
    componentsOf(example).every((name) => components.has(name)),
  );
  const docs = (names: readonly string[]) =>
    buildA2uiDocs(names, { catalog, examples: docsExamples });
  let snippet: string | undefined;

  return {
    catalog,
    catalogs,
    docs: (params) => {
      const names = Array.isArray(params?.components) ? params.components.map(String) : [];
      if (names.length === 0) return 'Name the components or functions to read, from the index.';
      return docs(names.slice(0, 8));
    },
    docsTool: {
      description: A2UI_DOCS_TOOL_DESCRIPTION,
      name: A2UI_DOCS_TOOL_NAME,
      parameters: A2UI_DOCS_TOOL_PARAMETERS,
    },
    examples,
    execute: (params) => {
      const result = validate(params?.operations);
      if (!result.ok) {
        // Progressive disclosure on failure: the schemas of the components the errors name.
        const involved = componentsInErrors(result.errors).filter((name) => components.has(name));
        const reference =
          progressive && involved.length > 0
            ? `\n\nSchemas of the components involved:\n${buildA2uiDocs(involved.slice(0, 4), { catalog, examples: [] })}`
            : '';
        const message = `The card was not drawn. Fix these and call ${A2UI_TOOL_NAME} again:\n- ${result.errors.join('\n- ')}${reference}`;
        return {
          content: message,
          error: { body: { errors: result.errors }, message, type: 'InvalidSurface' },
          success: false,
        };
      }
      return {
        content: `Card drawn and shown to the user: ${surfaceToText(result.record, { max: 300 }) || result.record.surfaceId}. Do not repeat its content in text.`,
        state: { surface: result.record },
        success: true,
      };
    },
    get promptSnippet() {
      if (snippet === undefined) {
        const rules =
          options.productRules === false
            ? ''
            : (options.productRules ?? a2uiProductRules(delivery));
        snippet = [
          '<a2ui_guide>',
          rules,
          progressive
            ? buildA2uiIndexPrompt({ catalog, delivery, docs: docsAccess, examples })
            : buildA2uiPrompt({ catalog, delivery, examples }),
          '</a2ui_guide>',
        ]
          .filter(Boolean)
          .join('\n\n');
      }
      return snippet;
    },
    tool: {
      description: A2UI_TOOL_DESCRIPTION,
      meta: A2UI_TOOL_META,
      name: A2UI_TOOL_NAME,
      parameters: A2UI_TOOL_PARAMETERS,
    },
    validate,
  };
};

let defaultProcessor: A2uiProcessor | undefined;
/** The processor for a LobeHub host that draws both catalogs and takes cards through `renderUI`. */
export const getA2uiProcessor = () => (defaultProcessor ??= createA2uiProcessor());

/** The card tool run by the default processor: the surface to store, or the errors to fix. */
export const runA2uiTool = (params: A2uiToolParams | undefined) =>
  getA2uiProcessor().execute(params);

/** The default processor's prompt snippet: product rules plus the generated A2UI prompt. */
export const getA2uiSystemPrompt = () => getA2uiProcessor().promptSnippet;

/** A prompt snippet for other options, e.g. `{ delivery: 'cli' }` for `lh card render`. */
export const buildA2uiSystemPrompt = (options: A2uiProcessorOptions = {}) =>
  createA2uiProcessor(options).promptSnippet;

/** The docs tool run by the default processor: full schemas and examples of the named components. */
export const runA2uiDocsTool = (params: A2uiDocsParams | undefined) => getA2uiProcessor().docs(params);
