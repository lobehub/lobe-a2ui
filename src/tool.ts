import { surfaceToText } from './fallback';
import type { A2uiSurfaceRecord } from './types';
import { validateSurface } from './validate';

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

/**
 * Runs the card tool: validates the messages and returns the surface to store with a summary for
 * the model, or the errors the model must fix before calling again.
 */
export const runA2uiTool = (params: A2uiToolParams | undefined): A2uiToolResult => {
  const result = validateSurface(params?.operations);
  if (!result.ok) {
    const message = `The card was not drawn. Fix these and call ${A2UI_TOOL_NAME} again:\n- ${result.errors.join('\n- ')}`;
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
};
