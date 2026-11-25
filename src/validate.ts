import { MessageProcessor } from '@a2ui/web_core';

import { A2UI_CATALOG_ID, A2UI_COMPONENT_NAMES, A2UI_LIST_LIMITS, A2UI_VERSION } from './catalog';
import { dataModelOf, resolve, surfaceText, surfaceTitle } from './fallback';
import { iconError } from './icons';
import { getSchemaCatalog } from './schemaCatalog';
import type { A2uiOperation, A2uiSurfaceRecord } from './types';
import { isHttpsUrl } from './url';

export { getSchemaCatalog } from './schemaCatalog';
export { isHttpsUrl } from './url';

/** Bounds on one surface, so a runaway generation can't flood a message. */
export const A2UI_LIMITS = { bytes: 64 * 1024, components: 200, operations: 50 } as const;

/** A2UI 1.0 as CopilotKit 1.83 and some models spell it. Read as the same version. */
const LEGACY_VERSIONS = new Set(['v1.0', 'v1', '1']);

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

/**
 * Every operation in the current version, on this catalog, for one surface. A `createSurface`
 * that carries its components and data model inline (A2UI 1.0 allows both) is split into the
 * `updateComponents` and `updateDataModel` messages it stands for.
 */
export const normalizeOperations = (
  operations: A2uiOperation[],
  surfaceId: string,
): A2uiOperation[] => {
  const normalized = operations.flatMap((operation): A2uiOperation[] => {
    const version = operation.version;
    const next: A2uiOperation = {
      ...operation,
      version:
        version === undefined || (typeof version === 'string' && LEGACY_VERSIONS.has(version))
          ? A2UI_VERSION
          : version,
    };
    if (!isRecord(next.createSurface)) return [next];
    const { components, dataModel, ...create } = next.createSurface;
    const split: A2uiOperation[] = [
      { ...next, createSurface: { ...create, catalogId: A2UI_CATALOG_ID, surfaceId } },
    ];
    if (Array.isArray(components))
      split.push({ updateComponents: { components, surfaceId }, version: next.version });
    if (dataModel !== undefined)
      split.push({
        updateDataModel: { path: '/', surfaceId, value: dataModel },
        version: next.version,
      });
    return split;
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

const MEDIA_PROPS: Record<string, string[]> = {
  AudioPlayer: ['url'],
  Image: ['url'],
  Video: ['url', 'posterUrl'],
};
/** SVG path data: commands, numbers and separators, nothing that could carry markup. */
const SVG_PATH = /^[\d\s+,.ACEHLMQSTVZ-]*$/i;

/** Every `openUrl` call in a value, however deeply it sits in actions and checks. */
const openUrlCalls = (value: unknown, found: Record<string, unknown>[] = []) => {
  if (Array.isArray(value)) for (const item of value) openUrlCalls(item, found);
  else if (isRecord(value)) {
    if (value['@call'] === 'openUrl' || value.call === 'openUrl') found.push(value);
    for (const item of Object.values(value)) openUrlCalls(item, found);
  }
  return found;
};

/** Checks the schema can't make: bound data sizes, https-only media and links, icon names. */
const safetyErrors = (component: Record<string, unknown>, model: Record<string, unknown>) => {
  const errors: string[] = [];
  const name = String(component.component);
  const label = `${name} ${String(component.id)}`;

  for (const [key, max] of Object.entries(A2UI_LIST_LIMITS[name] ?? {})) {
    const value = resolve(component[key], model);
    if (Array.isArray(value) && value.length > max)
      errors.push(`${label}: at most ${max} ${key === 'data' ? 'rows' : key}`);
  }

  for (const key of MEDIA_PROPS[name] ?? []) {
    if (component[key] === undefined) continue;
    const value = resolve(component[key], model);
    // A value bound to data that isn't there yet renders nothing; only a present one is checked.
    if (value !== undefined && !isHttpsUrl(value)) errors.push(`${label}: ${key} must be https`);
  }

  for (const call of openUrlCalls(component)) {
    const args = isRecord(call.args) ? call.args : {};
    const url = isRecord(args.url) ? undefined : args.url;
    if (url !== undefined && !isHttpsUrl(url)) errors.push(`${label}: openUrl needs an https url`);
  }

  if (name === 'Icon') {
    const iconName = resolve(component.name, model);
    if (isRecord(component.name) && typeof component.name.svgPath === 'string') {
      if (!SVG_PATH.test(component.name.svgPath)) errors.push(`${label}: svgPath is not path data`);
    } else if (typeof iconName === 'string') {
      const error = iconError(component.set as string | undefined, iconName);
      if (error) errors.push(`${label}: ${error}`);
    }
  }
  return errors;
};

/**
 * Checks what an Agent drew before it is stored: the A2UI message and component schemas of the
 * merged catalog, then the safety limits. Returns the record to store, or the errors to hand back
 * to the Agent so it can fix its call. Accepts operations as an array or a JSON string.
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
  const model = dataModelOf(operations);
  if (components.length === 0) errors.push('No components: send updateComponents with a root');
  if (components.length > A2UI_LIMITS.components)
    errors.push(`At most ${A2UI_LIMITS.components} components per surface`);
  for (const component of components) {
    const name = component.component;
    if (typeof name !== 'string' || !A2UI_COMPONENT_NAMES.has(name)) {
      errors.push(
        `Unknown component "${String(name)}" (${String(component.id)}). Use one of: ${[...A2UI_COMPONENT_NAMES].join(', ')}`,
      );
      continue;
    }
    errors.push(...safetyErrors(component, model));
  }
  if (components.length > 0 && !components.some((component) => component.id === 'root'))
    errors.push('One component must have id "root"');
  if (errors.length > 0) return { errors: [...new Set(errors)], ok: false };

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
    errors.push((error as Error).message);
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
