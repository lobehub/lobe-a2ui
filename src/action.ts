import type { A2uiActionPayload, A2uiSurfaceRecord } from './types';

/**
 * An action as the message that carries it back to the Agent: one readable line (the action's
 * `userMessage` when the Agent wrote one, else its event name), then the official A2UI
 * renderer-to-agent message in a tagged block the Agent parses. The tag keeps it apart from
 * anything the person might have typed.
 */
export const actionToMessage = (action: A2uiActionPayload, surface: A2uiSurfaceRecord) => {
  const payload = JSON.stringify({
    action: {
      context: action.context ?? {},
      name: action.name,
      ...(action.sourceComponentId ? { sourceComponentId: action.sourceComponentId } : {}),
      surfaceId: action.surfaceId,
      timestamp: action.timestamp ?? new Date().toISOString(),
      ...(action.userMessage ? { userMessage: action.userMessage } : {}),
    },
    version: '1.0',
  });
  const line = action.userMessage || action.name;
  const title = surface.title ? `「${surface.title}」 · ` : '';
  return `${title}${line}\n<a2ui_action>${payload}</a2ui_action>`;
};

const ACTION_BLOCK = /<a2ui_action>([\s\S]*?)<\/a2ui_action>/;

/** The action a message carries, if it was sent from a card (the official message, or the 1.0.x shape). */
export const parseActionMessage = (content: string): A2uiActionPayload | undefined => {
  const match = ACTION_BLOCK.exec(content);
  if (!match) return undefined;
  try {
    const parsed = JSON.parse(match[1]);
    const action = parsed?.action ?? parsed;
    return typeof action?.name === 'string' && typeof action?.surfaceId === 'string'
      ? action
      : undefined;
  } catch {
    return undefined;
  }
};
