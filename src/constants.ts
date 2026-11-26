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
  Chart: { data: 200 },
  Grid: { children: 12 },
  KeyValue: { items: 30 },
  Metrics: { items: 8 },
  Steps: { items: 20 },
  Table: { rows: 50 },
};
