/** One A2UI agent-to-renderer message, as the Agent wrote it. */
export type A2uiOperation = Record<string, unknown>;

/**
 * A surface an Agent drew, stored with the message that carries it.
 *
 * `operations` is the validated A2UI message list that recreates the surface; a client replays it
 * into a fresh processor. `fallback` is the one line shown where the surface can't be drawn:
 * conversation lists, notifications, bot platforms, and the history an Agent reads back.
 */
export interface A2uiSurfaceRecord {
  catalogId: string;
  fallback: string;
  operations: A2uiOperation[];
  /** Set once a person acted on it, where the host stores that with the record; read-only then. */
  state?: A2uiSurfaceState;
  surfaceId: string;
  title?: string;
  version: string;
}

/**
 * What a person did on a surface: the official A2UI renderer-to-agent `action`, with the event's
 * name, its context after resolving bindings, and the optional `userMessage` the Agent wrote.
 */
export interface A2uiActionPayload {
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  name: string;
  sourceComponentId?: string;
  surfaceId: string;
  timestamp?: string;
  userMessage?: string;
}

/** A surface's lifecycle once drawn. Submitted surfaces turn read-only. */
export interface A2uiSurfaceState {
  /** The action that closed it, when it was submitted. */
  action?: A2uiActionPayload;
  status: 'open' | 'submitted';
  submittedAt?: string;
  submittedBy?: { id: string; name: string };
}
