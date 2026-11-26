/** One example surface: the messages that draw it, as in google/A2UI `catalogs/<name>/<version>/examples`. */
export interface A2uiExample {
  /** The catalog it belongs to: `basic` (official) or `lobehub` (the extensions). */
  catalog: string;
  description?: string;
  /** The file name without `.json`, e.g. `flight-status`. */
  id: string;
  messages: Record<string, unknown>[];
  name: string;
}
