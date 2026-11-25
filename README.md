# @lobehub/a2ui

[A2UI](https://github.com/google/A2UI) cards drawn with [`@lobehub/ui`](https://github.com/lobehub/lobe-ui) and [`@lobehub/charts`](https://github.com/lobehub/lobe-charts).

An Agent describes a card as A2UI 1.0 messages; this package checks them against LobeHub's catalog and draws them in the product's own design.

## Entries

| Import                 | Runs on        | What                                                                             |
| ---------------------- | -------------- | -------------------------------------------------------------------------------- |
| `@lobehub/a2ui`        | server, client | Catalog, `validateSurface`, text fallback (`surfaceToText`), action message format |
| `@lobehub/a2ui/react`  | client         | `SurfaceView`, the `@lobehub/ui` implementation of every component, host context |

The root entry has no React dependency, so a server validates and stores cards with it.

## Catalog

Official A2UI basic components keep their names and schemas: `Card` (outer `Surface`), `Column`, `Row`, `Text`, `Divider`, `Button`, `Image`, `TextField`, `CheckBox`, `ChoicePicker`, `Slider`.

LobeHub extensions: `Metrics` (`MetricStrip`, one row while readable, balanced rows when not), `Callout`, `Items` (status list), `Bars`, `Chart` (line / area / bar / donut / barList), `Tag`.

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

`@lobehub/ui`, `@lobehub/charts`, `react` and `react-dom` are peer dependencies.

## License

MIT
