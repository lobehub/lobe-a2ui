# @lobehub/a2ui

[A2UI](https://github.com/google/A2UI) surfaces drawn with [`@lobehub/ui`](https://github.com/lobehub/lobe-ui) and [`@lobehub/charts`](https://github.com/lobehub/lobe-charts).

An Agent describes a surface as A2UI 1.0 messages; this package validates them against LobeHub's catalog, turns them into text where they can't be drawn, writes the prompt that teaches a model the catalog, and draws them in the product's own design.

## Entries

| Import                | Runs on        | What                                                                                              |
| --------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `@lobehub/a2ui`       | server, client | Catalog documents, `validateSurface`, `buildA2uiPrompt`, text fallback (`surfaceToText`), actions |
| `@lobehub/a2ui/react` | client         | `SurfaceView`, the `@lobehub/ui` implementation of every component and function, host context     |

The root entry has no React dependency, so a server validates, stores and prompts with it.

## Catalog

The catalog is two A2UI catalog documents (JSON Schema, with the descriptions a model reads), merged:

- `src/schema/basic_catalog.json`: the official A2UI 1.0 basic catalog, verbatim from google/A2UI `catalogs/basic/v1/catalog.json`.
- `src/schema/lobehub_catalog.json`: LobeHub's extension catalog in the same format: neutral building blocks, and Icon names that also reach a bundled set of Lucide icons. Every official component and prop stays as the basic catalog defines it.

Validation, rendering and the prompt all read the merged document (`A2UI_CATALOG_DOCUMENT`): web_core derives each component's validator from its JSON Schema (`Catalog.fromJson`), so the server checks exactly what the renderer reads, and the prompt shows the same schema.

Any component may be the root. `SurfaceView` frames the surface in a `Surface` card: a `Card` root is that card, any other root is placed in one.

### Official basic catalog coverage

| Component     | Props                                                                                                   | Drawn with (`@lobehub/ui` unless noted)                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Text          | `text`, `variant` (`body`, `caption`), `weight`                                                         | `Markdown`; a one-line `#`–`#####` heading as `Text` at heading size; caption as small secondary `Text` with inline `code` and **bold** |
| Image         | `url`, `description`, `fit` (all 5), `variant` (all 6), `weight`                                        | `Image`: icon 24, avatar 40 round, smallFeature 100, mediumFeature ≤ 300 high, largeFeature ≤ 400 high, header 200 high cover           |
| Icon          | `name` (all 59 basic names, `svgPath`, binding), `weight`                                               | Lucide icon of the same meaning (bundled, one lazy chunk); `svgPath` as a 24-box SVG path                                               |
| Video         | `url`, `posterUrl`, `weight`                                                                            | `Video` with controls, full width                                                                                                       |
| AudioPlayer   | `url`, `description`, `weight`                                                                          | native `<audio controls>`, full width, description above                                                                                |
| Row           | `children` (list or template), `justify` (all 7), `align` (all 4), `weight`                             | `Flexbox horizontal`, wraps                                                                                                             |
| Column        | `children`, `justify`, `align`, `weight`                                                                | `Flexbox`                                                                                                                               |
| List          | `children`, `direction` (`vertical`, `horizontal`), `align`, `weight`                                   | scrolling `Flexbox`; horizontal hides the scrollbar and caps child width                                                                |
| Card          | `child`, `weight` (+ LobeHub `title`, `description`, `badge`)                                           | dashboard `Surface` (header from `Surface` heading); nested cards draw as filled tiles, no border                                       |
| Tabs          | `tabs[{title, child}]`, `weight`                                                                        | `Tabs`, only the active child drawn                                                                                                     |
| Modal         | `trigger`, `content`, `weight`                                                                          | trigger inline; `Modal` with close on cancel                                                                                            |
| Divider       | `axis` (`horizontal`, `vertical`), `weight`                                                             | `Divider`; vertical as a 1px rule                                                                                                       |
| Button        | `child`, `variant` (`default`, `primary`, `borderless`), `action`, `@checks`, `weight`                  | `Button`: primary → `primary`, default → `fill`, borderless → `text`; disabled while checks fail                                        |
| TextField     | `label`, `value`, `placeholder`, `variant` (all 4), `@checks`, `weight`                                 | `Input` / `TextArea` (longText) / password (obscured) / number; check messages under the field                                          |
| CheckBox      | `label`, `value`, `@checks`, `weight`                                                                   | `Checkbox`                                                                                                                              |
| ChoicePicker  | `label`, `options`, `value`, `variant` (both), `displayStyle` (both), `filterable`, `@checks`, `weight` | checkbox list (multiple), `RadioGroup` (exclusive), chips as round `Button`s; filterable adds an `Input` filter                         |
| Slider        | `label`, `min`, `max`, `value`, `steps`, `@checks`, `weight`                                            | `Slider` with the current value                                                                                                         |
| DateTimeInput | `label`, `value`, `enableDate`, `enableTime`, `min`, `max`, `@checks`, `weight`                         | `Input` of type date / time / datetime-local; values read and written as ISO 8601                                                       |
| (all)         | `accessibility` (`label`, `description`)                                                                | set by web_core on each component's element                                                                                             |

| Function                                                                    | Implementation                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `required`, `regex`, `length`, `numeric`, `email`                           | web_core (`createBasicCatalogFunctions`), messages shown under the input      |
| `formatString`, `formatNumber`, `formatCurrency`, `formatDate`, `pluralize` | web_core, in the reader's locale                                              |
| `and`, `or`, `not`, `@index`                                                | web_core                                                                      |
| `openUrl`                                                                   | ours: https only, new tab with `noopener,noreferrer`; validation rejects http |

All 43 official examples (`src/examples/basic/v1`, from `catalogs/basic/v1/examples`) validate and render in the tests.

### LobeHub extension catalog

`src/schema/lobehub_catalog.json` (catalog id `https://lobehub.com/a2ui/catalog/v1`) adds neutral building blocks in the official catalog format. Every word they show comes from the Agent; props only set data, tone, size and layout.

| Component   | Drawn with              | Props                                                                                                                                                                                        |
| ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Chart`     | `@lobehub/charts`       | `type` (line, area, bar, donut, barList, scatter, funnel, radar, heatmap, tracker, sparkLine, sparkArea, sparkBar, categoryBar), `data` (≤ 200 rows), `index`, `categories`, `title`, `unit` |
| `Metrics`   | dashboard `MetricStrip` | `items[{label, value, delta, direction, tone, hint}]` (≤ 8), `variant`                                                                                                                       |
| `Statistic` | `Text`                  | `label`, `value`, `prefix`, `suffix`, `caption`, `tone`                                                                                                                                      |
| `Table`     | `Table`                 | `columns[{key, label, align}]` (≤ 8), `rows` (≤ 50), `title`, `caption`                                                                                                                      |
| `KeyValue`  | `Descriptions`          | `items[{label, value}]` (≤ 30), `columns`, `title`                                                                                                                                           |
| `Progress`  | `Progress`              | `label`, `value`, `max`, `caption`, `tone`, `variant` (line, circle)                                                                                                                         |
| `Steps`     | `Steps`                 | `items[{title, detail, meta, status}]` (≤ 20), `orientation`, `title`                                                                                                                        |
| `Tag`       | `Tag`                   | `text`, `color`, `icon`                                                                                                                                                                      |
| `Callout`   | `Alert`                 | `level`, `title`, `body`                                                                                                                                                                     |
| `Avatar`    | `Avatar`                | `src` (https), `text` (emoji or initials), `size`, `shape`                                                                                                                                   |
| `Code`      | `Highlighter`           | `code`, `language`                                                                                                                                                                           |
| `Collapse`  | `Accordion`             | `title`, `child`, `defaultOpen`                                                                                                                                                              |
| `Grid`      | `Grid`                  | `children` (≤ 12), `columns` (2–4, stack when narrow)                                                                                                                                        |
| `Icon`      | basic Icon, plus sets   | `name` also takes `lucide:<name>` from the bundled set                                                                                                                                       |

### Examples

Like google/A2UI's `catalogs/<name>/<version>/examples`, every catalog ships complete example surfaces: `src/examples/basic/v1` holds the 43 official basic examples verbatim, `src/examples/lobehub/v1` ten LobeHub surfaces of different shapes that use every extension component and chart type. `loadExamples(catalogs, ids?)` reads them; tests validate and render every one.

### Icons

`Icon.name` keeps the 59 basic names and adds `lucide:<name>` (kebab-case, `lucide:trending-up`) from a fixed set of about 210 Lucide icons listed in `src/icons/names.ts`. The set ships inside the renderer (`src/react/icons/lucide.ts`, imported from `lucide-react`, a peer) as one lazy chunk that loads the first time a card shows an icon: no icon is fetched from a CDN, and hosts that never draw one don't load it. It is about 20 KB gzipped.

Icons are muted line icons in the secondary text colour, an accent beside a heading or label. There are no brand logos. Names outside the set fail validation with close suggestions; stored cards that name one draw nothing in its place instead of an empty gap. To add an icon, add its name to `names.ts` and its import to `lucide.ts`; a test keeps the two in step.

### Chart colours

Series take four colours in a fixed order, a step per theme: blue, orange, aqua, yellow (light `#2a78d6 #eb6834 #1baf7a #eda100`, dark `#3987e5 #d95926 #199e70 #c98500`). Neighbours stay apart for colour-blind readers, and charts with more than one series keep their legend. Bars leave a third of each slot empty; a tracker with up to 60 blocks fills the card's width as a slim bar.

### Safety

On top of the schema: at most 50 operations, 200 components and 64 KB per surface; bound lists capped like literal ones (Chart 200 rows, Table 50, …); media (`Image`, `Video`, `AudioPlayer`, `Avatar`) and `openUrl` must be https (stricter than the guide's http/data allowance), checked again at render for bound data; `svgPath` must be path data; HTML in text isn't rendered.

## Processor

`createA2uiProcessor(options)` mirrors the official SDK's `A2uiRequestProcessor`: a host builds one from the catalogs its renderer supports and gets everything it wires:

```ts
const processor = createA2uiProcessor({
  catalogs: ['basic', 'lobehub'], // what the renderer can draw; a host that can't draw creates none
  delivery: 'tool', // or 'cli' for `lh card render`
  examples: undefined, // two short ones up front (progressive); 'all', false, or a list
  prompt: 'progressive', // or 'full' for the official prompt with every schema up front
  prune: { components: undefined, functions: undefined }, // static allowlists
});

processor.promptSnippet; // append to the system instruction while the card tool is active
processor.tool; // { name: 'renderUI', description, parameters, meta }
processor.docsTool; // { name: 'readCardDocs', description, parameters }
processor.docs({ components: ['Chart', 'Table'] }); // their full schemas and smallest examples
processor.execute({ operations }); // { success, content, state: { surface } } or { success: false, content, error }
processor.validate(operations); // the record, or errors against the active catalogs
```

Examples are validated against the active catalogs when the processor is built; examples that use a catalog the host doesn't support are left out. `getA2uiProcessor()` is the default (both catalogs, `renderUI`), with `getA2uiSystemPrompt()` and `runA2uiTool()` as shorthands.

The prompt is progressive. The official Direct JSON generator (google/A2UI `python/a2ui_agent/src/a2ui/inference_formats/direct_json`) puts every schema and its examples in the system prompt; for the basic catalog alone that is about 41K characters before any example. Here the always-on snippet carries:

- a short product layer (when a card helps, no filler buttons, honest figures);
- the official workflow rules (delivery through the tool's `operations` argument or the command instead of `<a2ui-json>` tags; root first, parents before children);
- an index with one line per component and function, derived from the catalog schema (`Chart(type: "line"|..., data: object[]|{@path}, index: string, ...) — A chart drawn with @lobehub/charts.`);
- two short examples.

The full schema and the smallest examples of a component are read on demand with `readCardDocs` (`lh card guide --components` for external runtimes), and an invalid card comes back with the schemas of the components its errors name. A test keeps the always-on snippet under a third of the official basic-catalog prompt. `prompt: 'full'` restores the official all-up-front prompt.

| Configuration                          | Characters |
| -------------------------------------- | ---------- |
| progressive (default), basic + lobehub | ≈ 11.1K    |
| official full prompt, basic only       | ≈ 41.1K    |
| full, basic + lobehub, 15 examples     | ≈ 84.8K    |

## What a host wires

A host keeps only what is its own: where an action goes, whether this person may act, and the reader's language.

| Need               | Export                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt, tool, run  | `createA2uiProcessor` / `getA2uiProcessor`, `getA2uiSystemPrompt`, `runA2uiTool`, `runA2uiDocsTool`, `A2UI_TOOL_*`, `A2UI_DOCS_TOOL_*` |
| Stored surfaces    | `A2uiSurfaceRecord` (with optional `state`), `toSurfaceRecords`, `isA2uiToolResult`, `surfacesFromToolResults`, `surfacesToText`       |
| Actions            | `actionToMessage` (official renderer-to-agent `action`, readable line from `userMessage`), `parseActionMessage`                        |
| Drawing (`/react`) | `A2uiHostProvider` with `{ canAct, sendAction, locale, labels? }`; `SurfaceList` / `HostedSurface` handle submission                   |

Package-owned words are only interface chrome (a filterable choice list's placeholder, an empty table), in en-US and zh-CN, picked by `locale`, which also formats numbers and dates.

```tsx
import { A2uiHostProvider, SurfaceList } from '@lobehub/a2ui/react';

<A2uiHostProvider value={{ canAct, locale, sendAction }}>
  <SurfaceList surfaces={surfaces} />
</A2uiHostProvider>;
```

`@lobehub/ui`, `@lobehub/charts`, `lucide-react`, `react` and `react-dom` are peer dependencies.

## License

MIT
