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

type Component = Record<string, unknown>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pathOf = (value: unknown) => {
  if (!isObject(value)) return;
  const path = value.path ?? value['@path'];
  return typeof path === 'string' ? path : undefined;
};

/** One value the person submitted, under the label its field showed on the card. */
export interface ActionField {
  key: string;
  label: string;
  /** Option values already read as the options' labels. */
  value: unknown;
}

const componentsOf = (surface: A2uiSurfaceRecord): Component[] =>
  surface.operations.flatMap((operation) => {
    const update = operation.updateComponents;
    return isObject(update) && Array.isArray(update.components)
      ? update.components.filter(isObject)
      : [];
  });

/**
 * The submitted values in the card's own words: each context key under the label of the field
 * bound to the same data path, and choices under their option labels. Without the card (outside
 * the loaded page), the keys stand in for the labels.
 */
export const actionFields = (
  action: A2uiActionPayload,
  surface?: A2uiSurfaceRecord,
): ActionField[] => {
  const context = action.context ?? {};
  const fieldByPath = new Map<string, Component>();
  const pathByKey = new Map<string, string>();
  for (const component of surface ? componentsOf(surface) : []) {
    const path = pathOf(component.value);
    if (path && component.label !== undefined) fieldByPath.set(path, component);
    const buttonAction = isObject(component.action) ? component.action : undefined;
    const event = isObject(buttonAction?.event) ? buttonAction.event : buttonAction;
    if (event?.name !== action.name || !isObject(event.context)) continue;
    for (const [key, value] of Object.entries(event.context)) {
      const bound = pathOf(value);
      if (bound) pathByKey.set(key, bound);
    }
  }
  // In the order the card showed its fields; keys it did not show follow.
  const order = [...fieldByPath.keys()];
  const rank = (key: string) => {
    const index = order.indexOf(pathByKey.get(key) ?? `/${key}`);
    return index === -1 ? order.length : index;
  };
  const keys = Object.keys(context).sort((a, b) => rank(a) - rank(b));
  return keys.map((key) => {
    const value = context[key];
    const field = fieldByPath.get(pathByKey.get(key) ?? `/${key}`);
    const options = Array.isArray(field?.options) ? field.options.filter(isObject) : [];
    const optionLabel = (item: unknown) => {
      const option = options.find((entry) => entry.value === item);
      return option?.label === undefined ? item : String(option.label);
    };
    return {
      key,
      label: typeof field?.label === 'string' && field.label ? field.label : key,
      value: Array.isArray(value) ? value.map(optionLabel) : optionLabel(value),
    };
  });
};


/**
 * A message sent from a card's button: the action, its values in the card's words, and the card's
 * title (from the card when it is loaded, else from the message's leading 「title」).
 */
export const readActionMessage = (
  content: string,
  surfaces: readonly A2uiSurfaceRecord[] | undefined,
) => {
  const action = parseActionMessage(content);
  if (!action) return;
  const surface = surfaces?.find((entry) => entry.surfaceId === action.surfaceId);
  const title = surface?.title || /^「(.+?)」/.exec(content)?.[1];
  return { action, fields: actionFields(action, surface), title };
};
