import type { CatalogDocument } from '../catalog';

/**
 * Progressive disclosure on top of the official prompt: the system prompt carries one line per
 * component and function (its props, derived from the catalog schema), and the full schemas and
 * examples of the components a card uses are read on demand. So the prompt an Agent always pays
 * for stays a fraction of the official full-schema prompt, and grows only with what a card needs.
 */

type Json = Record<string, unknown>;

const REF_TYPES: Record<string, string> = {
  Action: 'action',
  Checkable: '',
  Child: 'id',
  ChildList: 'id[]|template',
  DataBinding: '{@path}',
  DynamicBoolean: 'bool',
  DynamicNumber: 'number',
  DynamicString: 'string',
  DynamicStringList: 'string[]',
  DynamicValue: 'any',
  Weight: 'number',
};

const isDynamicRef = (schema: Json) =>
  typeof schema.$ref === 'string' && /\/(?:DataBinding|FunctionCall)$/.test(schema.$ref);

/** One level of an object's shape, so `items` reads `{label, value, delta?}`, not `object`. */
const shapeLine = (schema: Json) => {
  const required = new Set((schema.required as string[] | undefined) ?? []);
  const keys = Object.keys(schema.properties as Json).map(
    (key) => `${key}${required.has(key) ? '' : '?'}`,
  );
  return `{${keys.join(', ')}}`;
};

/** An array's item type: its shape when it has one, through any binding alternatives. */
const itemType = (items: Json | undefined): string => {
  if (!items) return 'any';
  const options = (items.anyOf ?? items.oneOf) as Json[] | undefined;
  const concrete = options?.filter((option) => !isDynamicRef(option));
  if (concrete?.length === 1) return itemType(concrete[0]);
  return items.properties ? shapeLine(items) : typeOf(items);
};

const typeOf = (schema: Json | undefined): string => {
  if (!schema) return 'any';
  if (typeof schema.$ref === 'string') {
    const name = schema.$ref.split('/').at(-1)!;
    return REF_TYPES[name] ?? name;
  }
  if (Array.isArray(schema.enum))
    return schema.enum.map((value) => JSON.stringify(value)).join('|');
  if ('const' in schema) return JSON.stringify(schema.const);
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    const options = (schema.oneOf ?? schema.anyOf) as Json[];
    // Official schemas spell "this type, or a binding, or a function call" on every prop; any prop
    // may bind (the header says so), so the index shows the type alone.
    const concrete = options.filter((option) => !isDynamicRef(option));
    const shown = concrete.length > 0 ? concrete : options;
    return [...new Set(shown.map(typeOf))].join('|');
  }
  if (schema.type === 'array') return `${itemType(schema.items as Json | undefined)}[]`;
  if (schema.properties) return shapeLine(schema);
  if (Array.isArray(schema.type))
    return schema.type.map((type) => (type === 'integer' ? 'number' : type)).join('|');
  if (schema.type === 'integer') return 'number';
  if (typeof schema.type === 'string') return schema.type === 'boolean' ? 'bool' : schema.type;
  return 'object';
};

/** A component's own properties and required names, including those of its `allOf` parts. */
const shapeOf = (schema: Json) => {
  const parts = [schema, ...((schema.allOf as Json[] | undefined) ?? [])];
  const properties: Record<string, Json> = {};
  const required = new Set<string>();
  let checkable = false;
  for (const part of parts) {
    if (typeof part.$ref === 'string' && part.$ref.endsWith('/Checkable')) checkable = true;
    Object.assign(properties, part.properties ?? {});
    for (const name of (part.required as string[] | undefined) ?? []) required.add(name);
  }
  return { checkable, properties, required };
};

/** The first sentence of a description, so an index line stays one line. */
const firstSentence = (text: unknown) => {
  if (typeof text !== 'string') return '';
  // A sentence ends at a stop before a capital letter or the end, so "e.g." does not cut it.
  const sentence = /^(.+?[.!?])(?=\s+[A-Z]|\s*$)/.exec(text.trim())?.[1] ?? text.trim();
  return sentence.length > 200 ? `${sentence.slice(0, 197)}...` : sentence;
};

/** `Name(prop: type, prop?: type) — what it is`, from the component's schema. */
export const componentSignature = (name: string, schema: Json): string => {
  const { checkable, properties, required } = shapeOf(schema);
  const props = Object.entries(properties)
    // Props kept only so stored cards replay are left out of what an Agent reads.
    .filter(([prop, value]) => prop !== 'component' && (value as Json).deprecated !== true)
    .map(([prop, value]) => `${prop}${required.has(prop) ? '' : '?'}: ${typeOf(value)}`);
  if (checkable) props.push('checks?: check[]');
  const summary = firstSentence(schema.description);
  return `${name}(${props.join(', ')})${summary ? ` — ${summary}` : ''}`;
};

/** `name(arg, arg?) → type — what it does`, from the function's schema. */
export const functionSignature = (name: string, schema: Json): string => {
  const args = ((schema.properties as Json | undefined)?.args ?? {}) as Json;
  const required = new Set((args.required as string[] | undefined) ?? []);
  const params = Object.keys((args.properties as Json | undefined) ?? {}).map(
    (arg) => `${arg}${required.has(arg) ? '' : '?'}`,
  );
  const returns = typeof schema.returnType === 'string' ? ` → ${schema.returnType}` : '';
  const summary = firstSentence(schema.description);
  return `${name}(${params.join(', ')})${returns}${summary ? ` — ${summary}` : ''}`;
};

/** The catalog as an index: one line per component, then one per function. */
export const catalogIndex = (catalog: CatalogDocument): string => {
  const components = Object.entries(catalog.components).map(([name, schema]) =>
    componentSignature(name, schema as Json),
  );
  const functions = Object.entries(catalog.functions ?? {}).map(([name, schema]) =>
    functionSignature(name, schema as Json),
  );
  return [
    '### Components (`?` marks optional props; `id` refers to another component by its id):',
    ...components.map((line) => `- ${line}`),
    '### Functions (`{"@call": name, "args": {...}}` wherever a dynamic value is accepted):',
    ...functions.map((line) => `- ${line}`),
  ].join('\n');
};
