# @lobehub/a2ui

[A2UI](https://github.com/google/A2UI) surfaces drawn with [`@lobehub/ui`](https://github.com/lobehub/lobe-ui) and [`@lobehub/charts`](https://github.com/lobehub/lobe-charts).

An Agent describes a surface as A2UI 1.0 messages; this package validates them against LobeHub's catalog, turns them into text where they can't be drawn, writes the system prompt that teaches a model the catalog, and draws them in the product's own design.

## Entries

| Import                | Runs on        | What                                                                                              |
| --------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `@lobehub/a2ui`       | server, client | Catalog documents, `validateSurface`, `buildA2uiPrompt`, text fallback (`surfaceToText`), actions |
| `@lobehub/a2ui/react` | client         | `SurfaceView`, the `@lobehub/ui` implementation of every component and function, host context     |

The root entry has no React dependency, so a server validates, stores and prompts with it.

## Catalog

The catalog is two A2UI catalog documents (JSON Schema, with the descriptions a model reads), merged:

- `src/schema/basic_catalog.json`: the official A2UI 1.0 basic catalog, verbatim from google/A2UI `catalogs/basic/v1/catalog.json`.
- `src/schema/lobehub_catalog.json`: LobeHub's extensions in the same format. It adds components and extends two basic ones (Card with a header, Icon with three icon sets); every official prop stays.

Validation, rendering and the prompt all read the merged document (`A2UI_CATALOG_DOCUMENT`): web_core derives each component's validator from its JSON Schema (`Catalog.fromJson`), so the server checks exactly what the renderer reads, and the prompt shows the same schema.

Any component may be the root. `SurfaceView` frames the surface in a `Surface` card: a `Card` root is that card, any other root is placed in one.

### Official basic catalog coverage

| Component     | Props                                                                                                   | Drawn with (`@lobehub/ui` unless noted)                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Text          | `text`, `variant` (`body`, `caption`), `weight`                                                         | `Markdown`; a one-line `#`–`#####` heading as `Text` at heading size; caption as small secondary `Text`                       |
| Image         | `url`, `description`, `fit` (all 5), `variant` (all 6), `weight`                                        | `Image`: icon 24, avatar 40 round, smallFeature 100, mediumFeature ≤ 300 high, largeFeature ≤ 400 high, header 200 high cover |
| Icon          | `name` (all 59 basic names, `svgPath`, binding), `weight`                                               | Lucide icon of the same meaning (lazy); `svgPath` as a 24-box SVG path                                                        |
| Video         | `url`, `posterUrl`, `weight`                                                                            | `Video` with controls, full width                                                                                             |
| AudioPlayer   | `url`, `description`, `weight`                                                                          | native `<audio controls>`, full width, description above                                                                      |
| Row           | `children` (list or template), `justify` (all 7), `align` (all 4), `weight`                             | `Flexbox horizontal`, wraps                                                                                                   |
| Column        | `children`, `justify`, `align`, `weight`                                                                | `Flexbox`                                                                                                                     |
| List          | `children`, `direction` (`vertical`, `horizontal`), `align`, `weight`                                   | scrolling `Flexbox`; horizontal hides the scrollbar and caps child width                                                      |
| Card          | `child`, `weight` (+ LobeHub `title`, `description`, `badge`)                                           | dashboard `Surface` (header from `Surface` heading); nested cards draw as inner outlines                                      |
| Tabs          | `tabs[{title, child}]`, `weight`                                                                        | `Tabs`, only the active child drawn                                                                                           |
| Modal         | `trigger`, `content`, `weight`                                                                          | trigger inline; `Modal` with close on cancel                                                                                  |
| Divider       | `axis` (`horizontal`, `vertical`), `weight`                                                             | `Divider`; vertical as a 1px rule                                                                                             |
| Button        | `child`, `variant` (`default`, `primary`, `borderless`), `action`, `@checks`, `weight`                  | `Button`: primary → `primary`, default → `fill`, borderless → `text`; disabled while checks fail                              |
| TextField     | `label`, `value`, `placeholder`, `variant` (all 4), `@checks`, `weight`                                 | `Input` / `TextArea` (longText) / password (obscured) / number; check messages under the field                                |
| CheckBox      | `label`, `value`, `@checks`, `weight`                                                                   | `Checkbox`                                                                                                                    |
| ChoicePicker  | `label`, `options`, `value`, `variant` (both), `displayStyle` (both), `filterable`, `@checks`, `weight` | checkbox list (multiple), `RadioGroup` (exclusive), chips as round `Button`s; filterable adds an `Input` filter               |
| Slider        | `label`, `min`, `max`, `value`, `steps`, `@checks`, `weight`                                            | `Slider` with the current value                                                                                               |
| DateTimeInput | `label`, `value`, `enableDate`, `enableTime`, `min`, `max`, `@checks`, `weight`                         | `Input` of type date / time / datetime-local; values read and written as ISO 8601                                             |
| (all)         | `accessibility` (`label`, `description`)                                                                | set by web_core on each component's element                                                                                   |

| Function                                                                    | Implementation                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `required`, `regex`, `length`, `numeric`, `email`                           | web_core (`createBasicCatalogFunctions`), messages shown under the input      |
| `formatString`, `formatNumber`, `formatCurrency`, `formatDate`, `pluralize` | web_core, in the reader's locale                                              |
| `and`, `or`, `not`, `@index`                                                | web_core                                                                      |
| `openUrl`                                                                   | ours: https only, new tab with `noopener,noreferrer`; validation rejects http |

All 43 official examples (`test/fixtures/official-examples`, from `catalogs/basic/v1/examples`) validate and render in the tests.

### LobeHub extensions

| Component  | Drawn with                       | For                                                                                                                    |
| ---------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Metrics`  | dashboard `MetricStrip`          | 1–8 headline figures, one row while readable, balanced rows when not                                                   |
| `Chart`    | `@lobehub/charts`                | line, area, bar, donut, barList, scatter, funnel, radar, heatmap, tracker, sparkLine, sparkArea, sparkBar, categoryBar |
| `Table`    | `Table`                          | comparisons and schedules (≤ 8 columns, ≤ 50 rows)                                                                     |
| `KeyValue` | `Descriptions`                   | facts about one thing (≤ 30 pairs)                                                                                     |
| `Progress` | `Progress` (line or circle)      | a quota, a goal, a rollout                                                                                             |
| `Steps`    | `Steps` (vertical or horizontal) | a plan, an itinerary, a timeline (≤ 20)                                                                                |
| `Grid`     | `Grid`                           | 2–4 equal columns that stack when narrow                                                                               |
| `Callout`  | `Alert`                          | a verdict, an incident, a blocker                                                                                      |
| `Items`    | status rows                      | findings or tasks with a status (≤ 30)                                                                                 |
| `Bars`     | bars                             | a short series with marked points                                                                                      |
| `Tag`      | `Tag`                            | a short status, often a Card badge                                                                                     |

### Icons

`Icon` takes the basic names, or `set` + `name`:

| `set`     | Names                                         | Package                          |
| --------- | --------------------------------------------- | -------------------------------- |
| `lucide`  | Lucide names, kebab-case (`trending-up`)      | `lucide-react` (peer)            |
| `simple`  | Simple Icons brand slugs (`github`, `notion`) | `@icons-pack/react-simple-icons` |
| `lobehub` | AI providers and models (`OpenAI`, `Claude`)  | `@lobehub/icons` (peer)          |

plus `size`, `color` (`brand` uses the brand's colour) and, for `lobehub`, `variant` (`mono`, `color`, `avatar`). Unknown names fail validation with close suggestions. Nothing is bundled eagerly: each set's name → loader table is a lazy chunk, and each icon its own chunk, so a card downloads only the icons it shows. The name lists the validator checks (`src/icons/names.ts`) and the loader tables are generated from the installed packages by `node scripts/icons.mjs`.

### Safety

On top of the schema: at most 50 operations, 200 components and 64 KB per surface; bound lists capped like literal ones (Chart 200 rows, Table 50, …); media (`Image`, `Video`, `AudioPlayer`) and `openUrl` must be https, checked again at render for bound data; `svgPath` must be path data; HTML in text isn't rendered.

## Prompt

`buildA2uiPrompt()` ports the official Direct JSON prompt generator (google/A2UI `python/a2ui_agent/src/a2ui/inference_formats/direct_json`): the workflow rules (delivery through the `renderUI` tool's `operations` argument instead of `<a2ui-json>` tags), then one schema block with the agent-to-renderer schema pruned to `createSurface` / `updateComponents` / `updateDataModel`, the common types the catalog and those messages use, and the merged catalog schema, then seven examples of differently shaped surfaces (four official, three LobeHub), then layout guidance. Options prune components, replace the examples or the guidance.

```ts
import { buildA2uiPrompt } from '@lobehub/a2ui';

const systemRole = `${whenToDrawACard}\n\n${buildA2uiPrompt()}`;
```

## Usage

```ts
import { validateSurface } from '@lobehub/a2ui';

const result = validateSurface(operations); // from the Agent's tool call
if (!result.ok) return result.errors; // hand back to the Agent to fix
store(result.record); // A2uiSurfaceRecord
```

```tsx
import { A2uiHostProvider, SurfaceView } from '@lobehub/a2ui/react';

<A2uiHostProvider value={{ canAct: true, sendAction, statusLabels }}>
  <SurfaceView record={record} onAction={(action) => sendAction(action, record)} />
</A2uiHostProvider>;
```

`@lobehub/ui`, `@lobehub/charts`, `@lobehub/icons`, `lucide-react`, `react` and `react-dom` are peer dependencies.

## License

MIT
