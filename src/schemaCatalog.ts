import { Catalog } from '@a2ui/web_core/v1_0';

import { A2UI_CATALOG_DOCUMENT } from './catalog';

let schemaCatalog: Catalog<never> | undefined;
/**
 * The merged catalog document as a schema-only catalog: web_core derives each component's
 * validator from its JSON Schema, so the server checks exactly what the renderer reads.
 */
export const getSchemaCatalog = () =>
  (schemaCatalog ??= Catalog.fromJson(A2UI_CATALOG_DOCUMENT as never) as Catalog<never>);

/** One component's API (name, derived schema) from the merged catalog. */
export const componentApi = (name: string) => {
  const api = (
    getSchemaCatalog() as unknown as { components: Map<string, unknown> }
  ).components.get(name);
  if (!api) throw new Error(`A2UI catalog has no component "${name}"`);
  return api;
};
