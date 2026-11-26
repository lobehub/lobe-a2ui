import { A2UI_TOOL_NAME } from './tool';
import type { A2uiSurfaceRecord } from './types';

/** The builtin tool identifier LobeHub hosts register the card tool under. */
export const A2UI_TOOL_IDENTIFIER = 'lobe-a2ui';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether a value is a stored surface: what `validateSurface` returned, kept as JSON. */
export const isSurfaceRecord = (value: unknown): value is A2uiSurfaceRecord =>
  isRecord(value) && typeof value.surfaceId === 'string' && Array.isArray(value.operations);

/** The well-formed surfaces in a stored list, such as a message's `metadata.surfaces`. */
export const toSurfaceRecords = (value: unknown): A2uiSurfaceRecord[] =>
  Array.isArray(value) ? value.filter(isSurfaceRecord) : [];

/** A tool call as hosts keep it: which tool and API ran, and the state its result stored. */
export interface A2uiToolCallLike {
  apiName?: string;
  identifier?: string;
  result?: { state?: unknown } | null;
}

/** Whether a tool call is a card the card tool drew, with its surface stored. */
export const isA2uiToolResult = (tool: A2uiToolCallLike | null | undefined): boolean =>
  !!tool &&
  tool.identifier === A2UI_TOOL_IDENTIFIER &&
  (tool.apiName === undefined || tool.apiName === A2UI_TOOL_NAME) &&
  isRecord(tool.result?.state) &&
  isSurfaceRecord(tool.result.state.surface);

/** The surfaces a list of tool calls drew, in call order. */
export const surfacesFromToolResults = (
  tools: readonly (A2uiToolCallLike | null | undefined)[] | null | undefined,
): A2uiSurfaceRecord[] =>
  (tools ?? [])
    .filter(isA2uiToolResult)
    .map((tool) => (tool!.result!.state as { surface: A2uiSurfaceRecord }).surface);

/** Surfaces as text lines (`[Card] …`), for where they can't be drawn: history, previews. */
export const surfacesToText = (surfaces: readonly A2uiSurfaceRecord[]) =>
  surfaces
    .map((surface) => surface.fallback || surface.title)
    .filter(Boolean)
    .map((line) => `[Card] ${line}`)
    .join('\n');
