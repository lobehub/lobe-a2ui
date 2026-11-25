import type { A2uiActionPayload, A2uiSurfaceRecord } from './types';

/**
 * An action as the message that carries it back to the Agent: one readable line, then the
 * structured payload in a tagged block the Agent parses. The tag keeps it apart from anything the
 * person might have typed.
 */
export const actionToMessage = (action: A2uiActionPayload, surface: A2uiSurfaceRecord) => {
  const payload = JSON.stringify({
    context: action.context ?? {},
    name: action.name,
    surfaceId: action.surfaceId,
  });
  const title = surface.title ? `「${surface.title}」` : '';
  return `${title}${title ? ' · ' : ''}${action.name}\n<a2ui_action>${payload}</a2ui_action>`;
};

const ACTION_BLOCK = /<a2ui_action>([\s\S]*?)<\/a2ui_action>/;

/** The action a message carries, if it was sent from a card. */
export const parseActionMessage = (content: string): A2uiActionPayload | undefined => {
  const match = ACTION_BLOCK.exec(content);
  if (!match) return undefined;
  try {
    const parsed = JSON.parse(match[1]);
    return typeof parsed?.name === 'string' && typeof parsed?.surfaceId === 'string'
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
};
