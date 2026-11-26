import basicCatalog from './schema/basic_catalog.json';
import lobehubCatalog from './schema/lobehub_catalog.json';

export { A2UI_CATALOG_ID, A2UI_LIST_LIMITS, A2UI_VERSION } from './constants';

/**
 * LobeHub's A2UI catalog: the official A2UI 1.0 basic catalog, unchanged, plus a small extension
 * catalog in the same format for what the basic catalog can't draw.
 *
 * `schema/basic_catalog.json` is google/A2UI `catalogs/basic/v1/catalog.json` verbatim: every
 * component, prop and function. `schema/lobehub_catalog.json` adds neutral building blocks
 * (Chart, Metrics, Statistic, Table, KeyValue, Progress, Steps, Tag, Callout, Avatar, Code,
 * Collapse, Grid) whose every word comes from the Agent, and lets Icon names reach the Lucide,
 * Simple Icons and LobeHub Icons sets (`lucide:rocket`, `simple:github`, `lobehub:OpenAI`). Validation, the renderer and the
 * prompt all read the merged document, so they can't drift apart.
 */
export type CatalogDocument = {
  $defs?: Record<string, unknown>;
  $id?: string;
  catalogId: string;
  components: Record<string, Record<string, unknown>>;
  description?: string;
  functions?: Record<string, Record<string, unknown>>;
  instructions?: string;
  protocolVersion?: string;
  title?: string;
} & Record<string, unknown>;

export const BASIC_CATALOG_DOCUMENT = basicCatalog as unknown as CatalogDocument;
export const LOBEHUB_CATALOG_DOCUMENT = lobehubCatalog as unknown as CatalogDocument;

export const A2UI_BASIC_CATALOG_ID = BASIC_CATALOG_DOCUMENT.catalogId;

/**
 * One catalog document from a base and extensions on top: an extension's component replaces the
 * base component of the same name, and the `anyComponent` / `anyFunction` unions list the result.
 */
export const mergeCatalogDocuments = (
  base: CatalogDocument,
  ...extensions: CatalogDocument[]
): CatalogDocument => {
  const last = extensions.at(-1) ?? base;
  const components = Object.assign({}, base.components, ...extensions.map((e) => e.components));
  const functions = Object.assign({}, base.functions, ...extensions.map((e) => e.functions ?? {}));
  return {
    ...base,
    $defs: {
      ...base.$defs,
      ...Object.assign({}, ...extensions.map((e) => e.$defs ?? {})),
      anyComponent: {
        discriminator: { propertyName: 'component' },
        oneOf: Object.keys(components).map((name) => ({ $ref: `#/components/${name}` })),
      },
      anyFunction: {
        oneOf: Object.keys(functions).map((name) => ({ $ref: `#/functions/${name}` })),
      },
    },
    $id: last.$id,
    catalogId: last.catalogId,
    components,
    description: [base.description, ...extensions.map((e) => e.description)]
      .filter(Boolean)
      .join(' '),
    functions,
    title: last.title,
  };
};

/** The catalog LobeHub validates, renders and prompts with. */
export const A2UI_CATALOG_DOCUMENT = mergeCatalogDocuments(
  BASIC_CATALOG_DOCUMENT,
  LOBEHUB_CATALOG_DOCUMENT,
);

export const A2UI_BASIC_COMPONENT_NAMES: readonly string[] = Object.keys(
  BASIC_CATALOG_DOCUMENT.components,
);
export const A2UI_EXTENSION_COMPONENT_NAMES: readonly string[] = Object.keys(
  LOBEHUB_CATALOG_DOCUMENT.components,
).filter((name) => !A2UI_BASIC_COMPONENT_NAMES.includes(name));
export const A2UI_COMPONENT_NAMES: ReadonlySet<string> = new Set(
  Object.keys(A2UI_CATALOG_DOCUMENT.components),
);
export const A2UI_FUNCTION_NAMES: ReadonlySet<string> = new Set(
  Object.keys(A2UI_CATALOG_DOCUMENT.functions ?? {}),
);

type Schema = {
  enum?: string[];
  items?: Schema;
  oneOf?: Schema[];
  properties?: Record<string, Schema>;
};
const propertyOf = (component: string, ...path: string[]): Schema | undefined =>
  path.reduce<Schema | undefined>((node, key) => {
    if (!node) return undefined;
    if (key === '[]') return node.oneOf?.find((option) => option.items)?.items ?? node.items;
    return node.properties?.[key];
  }, LOBEHUB_CATALOG_DOCUMENT.components[component] as Schema);

export const CHART_TYPES = propertyOf('Chart', 'type')!.enum as readonly string[];

