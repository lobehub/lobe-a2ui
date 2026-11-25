import { MessageProcessor } from '@a2ui/web_core';
import { Catalog } from '@a2ui/web_core/v1_0';

import {
  A2UI_CATALOG_ID,
  A2UI_COMPONENT_APIS,
  A2UI_COMPONENT_NAMES,
  A2UI_VERSION,
} from './catalog';
import { surfaceText, surfaceTitle } from './fallback';
import type { A2uiOperation, A2uiSurfaceRecord } from './types';

/** Bounds on one surface, so a runaway generation can't flood a message. */
export const A2UI_LIMITS = { bytes: 64 * 1024, components: 200, operations: 50 } as const;
/** Rows one chart may carry; more is a table, not a picture. */
const CHART_ROWS = 200;

/** A2UI 1.0 as CopilotKit 1.83 and some models spell it. Read as the same version. */
const LEGACY_VERSIONS = new Set(['v1.0', 'v1', '1']);

let schemaCatalog: Catalog<never> | undefined;
/** The catalog with schemas only: enough to validate on the server, where nothing renders. */
export const getSchemaCatalog = () =>
  (schemaCatalog ??= new Catalog(A2UI_CATALOG_ID, A2UI_VERSION, [
    ...A2UI_COMPONENT_APIS,
  ] as never) as Catalog<never>);

export type ValidateSurfaceResult =
  { errors: string[]; ok: false } | { ok: true; record: A2uiSurfaceRecord };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseOperations = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/** Every operation in the current version, on this catalog, for one surface. */
export const normalizeOperations = (
  operations: A2uiOperation[],
  surfaceId: string,
): A2uiOperation[] => {
  const normalized = operations.map((operation) => {
    const version = operation.version;
    const next: A2uiOperation = {
      ...operation,
      version:
        version === undefined || (typeof version === 'string' && LEGACY_VERSIONS.has(version))
          ? A2UI_VERSION
          : version,
    };
    if (isRecord(next.createSurface))
      next.createSurface = { ...next.createSurface, catalogId: A2UI_CATALOG_ID, surfaceId };
    return next;
  });
  // A model often starts at updateComponents; the surface it means is implied.
  if (!normalized.some((operation) => isRecord(operation.createSurface)))
    normalized.unshift({
      createSurface: { catalogId: A2UI_CATALOG_ID, surfaceId },
      version: A2UI_VERSION,
    });
  return normalized;
};

const componentsOf = (operations: A2uiOperation[]) =>
  operations.flatMap((operation) => {
    const update = operation.updateComponents;
    return isRecord(update) && Array.isArray(update.components)
      ? update.components.filter(isRecord)
      : [];
  });

const surfaceIdsOf = (operations: A2uiOperation[]) =>
  new Set(
    operations.flatMap((operation) =>
      Object.values(operation)
        .filter(isRecord)
        .map((body) => body.surfaceId)
        .filter((id): id is string => typeof id === 'string'),
    ),
  );

/**
 * Checks what an Agent drew before it is stored. Returns the record to store, or the errors to hand
 * back to the Agent so it can fix its call. Accepts operations as an array or a JSON string, since
 * models send both.
 */
export const validateSurface = (raw: unknown): ValidateSurfaceResult => {
  const parsed = parseOperations(raw);
  if (!Array.isArray(parsed) || parsed.length === 0)
    return { errors: ['operations must be a non-empty array of A2UI messages'], ok: false };
  if (parsed.length > A2UI_LIMITS.operations)
    return { errors: [`At most ${A2UI_LIMITS.operations} operations per surface`], ok: false };
  if (JSON.stringify(parsed).length > A2UI_LIMITS.bytes)
    return { errors: [`A surface must stay under ${A2UI_LIMITS.bytes / 1024} KB`], ok: false };
  if (!parsed.every(isRecord)) return { errors: ['Every operation must be an object'], ok: false };

  const ids = surfaceIdsOf(parsed);
  if (ids.size > 1)
    return {
      errors: ['Draw one surface per call: every operation must name the same surfaceId'],
      ok: false,
    };
  const surfaceId = [...ids][0] ?? 'main';
  const operations = normalizeOperations(parsed, surfaceId);

  const errors: string[] = [];
  const components = componentsOf(operations);
  if (components.length === 0) errors.push('No components: send updateComponents with a root');
  if (components.length > A2UI_LIMITS.components)
    errors.push(`At most ${A2UI_LIMITS.components} components per surface`);
  for (const component of components) {
    const name = component.component;
    if (typeof name !== 'string' || !A2UI_COMPONENT_NAMES.has(name))
      errors.push(
        `Unknown component "${String(name)}" (${String(component.id)}). Use one of: ${[...A2UI_COMPONENT_NAMES].join(', ')}`,
      );
    if (name === 'Chart' && Array.isArray(component.data) && component.data.length > CHART_ROWS)
      errors.push(`Chart ${String(component.id)}: at most ${CHART_ROWS} rows`);
    if (
      name === 'Image' &&
      typeof component.url === 'string' &&
      !component.url.startsWith('https://')
    )
      errors.push(`Image ${String(component.id)}: url must be https`);
  }
  if (components.length > 0 && !components.some((component) => component.id === 'root'))
    errors.push('One component must have id "root"');
  if (errors.length > 0) return { errors, ok: false };

  const processor = new MessageProcessor([getSchemaCatalog()] as never, undefined, {
    outboundListener: (message: unknown) => {
      const error = isRecord(message) && isRecord(message.error) ? message.error : undefined;
      if (error) errors.push(String(error.message ?? error.code));
    },
    unifiedOutbound: true,
  } as never);
  try {
    processor.processMessages(operations as never);
  } catch (error) {
    const message = (error as Error).message;
    if (!errors.includes(message)) errors.push(message);
  }
  if (errors.length > 0) return { errors: [...new Set(errors)], ok: false };

  const title = surfaceTitle(operations);
  return {
    ok: true,
    record: {
      catalogId: A2UI_CATALOG_ID,
      fallback: title ?? surfaceText(operations, 120),
      operations,
      surfaceId,
      title,
      version: A2UI_VERSION,
    },
  };
};
