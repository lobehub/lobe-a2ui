import type { A2uiSurfaceRecord } from './types';

/**
 * The card tool's contract, for any host that exposes it to a model: its name, description and
 * parameters, and what running it returns. A host wires these into its tool manifest and runtime,
 * so a dependency bump carries every change to the tool.
 */
export const A2UI_TOOL_NAME = 'renderUI';

export const A2UI_TOOL_DESCRIPTION =
  'Draw a card in the conversation from A2UI 1.0 messages for one surface: createSurface, updateComponents (flat components with ids, one with id "root") and optionally updateDataModel. Mostly for showing information visually (reports, comparisons, schedules, profiles, metrics, charts, tables); also for multi-field input. Design the layout for the content. Not for prose. Invalid cards come back with errors to fix.';

/** JSON Schema of the tool's arguments. */
export const A2UI_TOOL_PARAMETERS = {
  properties: {
    operations: {
      description:
        'The A2UI messages, in order. Each is an object with "version": "1.0" and one of createSurface, updateComponents, updateDataModel, all naming the same surfaceId.',
      items: { type: 'object' },
      type: 'array',
    },
  },
  required: ['operations'],
  type: 'object',
} as const;

/** The companion tool that reads full component docs on demand (progressive disclosure). */
export const A2UI_DOCS_TOOL_NAME = 'readCardDocs';

export const A2UI_DOCS_TOOL_DESCRIPTION =
  'Read the full schema and a small example of the A2UI components or functions a card will use, by name from the card guide index. Call it before using a component whose props you are unsure of.';

export const A2UI_DOCS_TOOL_PARAMETERS = {
  properties: {
    components: {
      description: 'Component or function names from the index, e.g. ["Chart", "Table", "formatNumber"].',
      items: { type: 'string' },
      maxItems: 8,
      minItems: 1,
      type: 'array',
    },
  },
  required: ['components'],
  type: 'object',
} as const;

export interface A2uiDocsParams {
  components: string[];
}

/** How the tool presents itself in a tool list. */
export const A2UI_TOOL_META = {
  avatar: '🧩',
  description:
    'Answer with visual cards: reports, comparisons, schedules, charts, tables and forms',
  title: 'Cards',
} as const;

export interface A2uiToolParams {
  /** A2UI 1.0 messages for one surface, as an array or a JSON string. */
  operations: unknown;
}

/** What the host keeps with the tool call: the surface its renderer draws. */
export interface A2uiToolState {
  surface: A2uiSurfaceRecord;
}

export type A2uiToolResult =
  | { content: string; state: A2uiToolState; success: true }
  | {
      content: string;
      error: { body: { errors: string[] }; message: string; type: 'InvalidSurface' };
      success: false;
    };
