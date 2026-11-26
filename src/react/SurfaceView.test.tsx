/**
 * @vitest-environment happy-dom
 */
import { ConfigProvider } from '@lobehub/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadExamples } from '../prompt';
import { validateSurface } from '../validate';
import { A2uiIcon } from './components';
import { A2uiHostProvider, resolveA2uiLocale } from './host';
import { SurfaceList, SurfaceView } from './SurfaceView';

afterEach(cleanup);

// lobe-ui buttons animate through the app's motion component.
const wrapper = ({ children }: { children: ReactNode }) => (
  <ConfigProvider motion={motion}>{children}</ConfigProvider>
);

const record = () => {
  const result = validateSurface([
    {
      updateComponents: {
        components: [
          { child: 'col', component: 'Card', id: 'root' },
          { children: ['head', 'metrics', 'go'], component: 'Column', id: 'col' },
          { children: ['title', 'tag'], component: 'Row', id: 'head' },
          { component: 'Text', id: 'title', text: 'Offsite' },
          { component: 'Tag', id: 'tag', text: 'Best match' },
          { component: 'Metrics', id: 'metrics', items: { '@path': '/metrics' } },
          {
            action: { event: { context: { people: { '@path': '/people' } }, name: 'book' } },
            child: 'goLabel',
            component: 'Button',
            id: 'go',
            variant: 'primary',
          },
          { component: 'Text', id: 'goLabel', text: 'Book it' },
        ],
        surfaceId: 'plan',
      },
      version: '1.0',
    },
    {
      updateDataModel: {
        path: '/',
        surfaceId: 'plan',
        value: { metrics: [{ label: 'Per person', value: '¥440' }], people: 18 },
      },
      version: '1.0',
    },
  ]);
  if (!result.ok) throw new Error(result.errors.join());
  return result.record;
};

describe('SurfaceView', () => {
  it('draws the card with lobe-ui and sends a button action with its bound data', async () => {
    const onAction = vi.fn();
    render(<SurfaceView record={record()} onAction={onAction} />, { wrapper });

    expect(await screen.findByText('Offsite')).toBeTruthy();
    expect(screen.getByText('Best match')).toBeTruthy();
    expect(screen.getByText('¥440')).toBeTruthy();
    // Before it is measured the strip takes one row; metricLayout.test.ts covers the wrapping.
    const grid = document.querySelector<HTMLElement>('.lobe-dashboard-metric-strip__grid');
    expect(grid?.style.getPropertyValue('--metric-columns')).toBe('1');
    expect(document.querySelector('.lobe-dashboard-metric-strip')?.getAttribute('data-size')).toBe(
      'small',
    );

    fireEvent.click(screen.getByText('Book it'));
    await vi.waitFor(() =>
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({ context: { people: 18 }, name: 'book', surfaceId: 'plan' }),
      ),
    );
  });

  it('falls back to the card text when the record cannot be replayed', () => {
    render(
      <SurfaceView
        record={{ ...record(), fallback: 'Offsite · ¥440', operations: [{ bogus: true }] }}
      />,
      { wrapper },
    );
    expect(screen.getByText('Offsite · ¥440')).toBeTruthy();
  });
});

describe('every component', () => {
  const examples = loadExamples(['basic']).map(
    (example) => [example.id, example.messages] as const,
  );

  it.each(examples)('draws the official example %s', async (_, messages) => {
    const result = validateSurface(messages);
    if (!result.ok) throw new Error(result.errors.join());
    const { container } = render(<SurfaceView record={result.record} />, { wrapper });
    // Replayed, not the text fallback.
    await vi.waitFor(() => expect(container.querySelector('.lobe-dashboard-surface')).toBeTruthy());
    expect(container.textContent?.length).toBeGreaterThan(0);
  });

  it.each(loadExamples(['lobehub']).map((example) => [example.id, example.messages] as const))(
    'draws the LobeHub example %s',
    async (id, messages) => {
      const result = validateSurface(messages);
      if (!result.ok) throw new Error(result.errors.join());
      const { container } = render(<SurfaceView record={result.record} />, { wrapper });
      await vi.waitFor(() =>
        expect(container.querySelector('.lobe-dashboard-surface')).toBeTruthy(),
      );
      if (id === 'plan-comparison') {
        expect(await screen.findByText('Pro fits a 14-person team best')).toBeTruthy();
        expect(screen.getByText('$19')).toBeTruthy();
      }
      if (id === 'trip-day') {
        expect(await screen.findByText('teamLab Planets')).toBeTruthy();
        expect(screen.getByText('Hotel')).toBeTruthy();
      }
    },
  );

  it('lazy-loads icons from each set', async () => {
    const { container } = render(
      <>
        <A2uiIcon name="home" />
        <A2uiIcon name="lucide:trending-up" />
        <A2uiIcon name="simple:github" />
        <A2uiIcon name="lobehub:openai" />
      </>,
      { wrapper },
    );
    await vi.waitFor(() => expect(container.querySelectorAll('svg').length).toBe(4), {
      timeout: 5000,
    });
  });
});

describe('text safety', () => {
  it('does not render HTML an Agent writes into text', async () => {
    const result = validateSurface([
      {
        updateComponents: {
          components: [
            {
              component: 'Text',
              id: 'root',
              text: 'Hi <img src=x onerror="alert(1)"><script>alert(2)</script>',
            },
          ],
          surfaceId: 's',
        },
        version: '1.0',
      },
    ]);
    if (!result.ok) throw new Error(result.errors.join());
    const { container } = render(<SurfaceView record={result.record} />, { wrapper });
    await vi.waitFor(() => expect(container.textContent).toContain('Hi'));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('host', () => {
  const form = () => {
    const result = validateSurface([
      {
        updateComponents: {
          components: [
            { children: ['table', 'pick', 'go'], component: 'Column', id: 'root' },
            { columns: [{ key: 'a', label: 'A' }], component: 'Table', id: 'table', rows: [] },
            {
              component: 'ChoicePicker',
              filterable: true,
              id: 'pick',
              options: [{ label: 'One', value: '1' }],
              value: { '@path': '/pick' },
            },
            { action: { event: { name: 'ok' } }, child: 'goL', component: 'Button', id: 'go' },
            { component: 'Text', id: 'goL', text: 'Approve now' },
          ],
          surfaceId: 'todo',
        },
        version: '1.0',
      },
    ]);
    if (!result.ok) throw new Error(result.errors.join());
    return result.record;
  };

  it('shows the package-owned chrome in the host locale, with overrides', async () => {
    const { unmount } = render(
      <A2uiHostProvider value={{ canAct: false, locale: 'zh-TW', sendAction: vi.fn() }}>
        <SurfaceList surfaces={[form()]} />
      </A2uiHostProvider>,
      { wrapper },
    );
    expect(await screen.findByPlaceholderText('筛选')).toBeTruthy();
    unmount();
    render(
      <A2uiHostProvider
        value={{ canAct: false, labels: { filter: 'Search' }, sendAction: vi.fn() }}
      >
        <SurfaceList surfaces={[form()]} />
      </A2uiHostProvider>,
      { wrapper },
    );
    expect(await screen.findByPlaceholderText('Search')).toBeTruthy();
  });

  it('sends actions through the host and turns the surface read-only once accepted', async () => {
    const sendAction = vi.fn(async (_action: unknown) => true);
    const { container } = render(
      <A2uiHostProvider value={{ canAct: true, sendAction }}>
        <SurfaceList surfaces={[form()]} />
      </A2uiHostProvider>,
      { wrapper },
    );
    fireEvent.click(await screen.findByText('Approve now'));
    await vi.waitFor(() => expect(sendAction).toHaveBeenCalledTimes(1));
    expect(sendAction.mock.calls[0][0]).toMatchObject({ name: 'ok', sourceComponentId: 'go' });
    await vi.waitFor(() => expect(container.querySelector('[aria-disabled="true"]')).toBeTruthy());
    fireEvent.click(screen.getByText('Approve now'));
    expect(sendAction).toHaveBeenCalledTimes(1);
  });

  it('starts read-only when the stored record says it was submitted', async () => {
    const { container } = render(
      <A2uiHostProvider value={{ canAct: true, sendAction: vi.fn(async () => true) }}>
        <SurfaceList surfaces={[{ ...form(), state: { status: 'submitted' } }]} />
      </A2uiHostProvider>,
      { wrapper },
    );
    await vi.waitFor(() => expect(container.querySelector('[aria-disabled="true"]')).toBeTruthy());
  });
});

describe('locale', () => {
  it('resolves language tags to built-in labels', () => {
    expect(resolveA2uiLocale('zh-CN')).toBe('zh-CN');
    expect(resolveA2uiLocale('zh_HK')).toBe('zh-CN');
    expect(resolveA2uiLocale('fr-FR')).toBe('en-US');
    expect(resolveA2uiLocale(undefined)).toBe('en-US');
  });
});
