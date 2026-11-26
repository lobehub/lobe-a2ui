/**
 * @vitest-environment happy-dom
 */
import { ConfigProvider } from '@lobehub/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LUCIDE_NAMES } from '../icons';
import { loadExamples } from '../prompt';
import { validateSurface } from '../validate';
import { A2uiIcon } from './components';
import { A2uiHostProvider, resolveA2uiLocale } from './host';
import { LUCIDE_ICONS } from './icons/lucide';
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
          { component: 'Badge', id: 'tag', label: 'Best match' },
          { component: 'StatGroup', id: 'metrics', items: { '@path': '/metrics' } },
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
    // The surface stands on the official dot-grid floor.
    expect(document.querySelector('[data-a2ui="floor"]')).toBeTruthy();

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
    await vi.waitFor(() => expect(container.querySelector('[data-a2ui="floor"]')).toBeTruthy());
    expect(container.textContent?.length).toBeGreaterThan(0);
  });

  it.each(loadExamples(['lobehub']).map((example) => [example.id, example.messages] as const))(
    'draws the LobeHub example %s',
    async (id, messages) => {
      const result = validateSurface(messages);
      if (!result.ok) throw new Error(result.errors.join());
      const { container } = render(<SurfaceView record={result.record} />, { wrapper });
      await vi.waitFor(() => expect(container.querySelector('[data-a2ui="floor"]')).toBeTruthy());
      if (id === 'plan-comparison') {
        expect(await screen.findByText('Pro fits a 14-person team best')).toBeTruthy();
        expect(screen.getByText('$19')).toBeTruthy();
      }
      if (id === 'kpi-dashboard') {
        // Heading, formatted table cells and a badge column.
        expect(await screen.findByText('Revenue grew 11% on EMEA renewals')).toBeTruthy();
        expect(screen.getByText('$12,400')).toBeTruthy();
        expect(screen.getByText('-3.5%')).toBeTruthy();
        expect(screen.getByText('Overdue')).toBeTruthy();
      }
      if (id === 'vendor-comparison') {
        expect(await screen.findByText('Error tracking for a 14-person team')).toBeTruthy();
        expect(screen.getByRole('link', { name: /Beacon pricing/ }).getAttribute('href')).toBe(
          'https://example.com/pricing/beacon',
        );
      }
      if (id === 'trip-day') {
        expect(await screen.findByText('teamLab Planets')).toBeTruthy();
        expect(screen.getByText('Hotel')).toBeTruthy();
      }
    },
  );

  it('draws icons from the bundled Lucide set, with no network request', async () => {
    const { container } = render(
      <>
        <A2uiIcon name="home" />
        <A2uiIcon name="lucide:trending-up" />
        <A2uiIcon name="lucide:TrendingUp" />
        <A2uiIcon name="simple:github" />
        <A2uiIcon name="lucide:no-such-icon" />
      </>,
      { wrapper },
    );
    await waitFor(() => expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(3));
    const icons = [...container.querySelectorAll('svg[role="img"]')];
    // Basic and lucide names draw inline SVG; brand and unknown names draw nothing at all.
    expect(icons.map((icon) => icon.getAttribute('aria-label'))).toEqual([
      'home',
      'lucide:trending-up',
      'lucide:TrendingUp',
    ]);
    expect(container.querySelector('img, [style*="mask"]')).toBeNull();
  });

  it('bundles every Lucide name the validator accepts', () => {
    expect(Object.keys(LUCIDE_ICONS).sort()).toEqual(LUCIDE_NAMES.split(' ').sort());
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

describe('clicking through', () => {
  const open = (url: string) => ({ functionCall: { args: { url }, call: 'openUrl' } });
  const linked = () => {
    const result = validateSurface([
      {
        updateComponents: {
          components: [
            { child: 'grid', component: 'Card', id: 'root' },
            { children: ['pr', 'note'], component: 'Grid', id: 'grid' },
            {
              action: open('https://github.com/o/r/pull/1'),
              child: 'prBody',
              component: 'Card',
              id: 'pr',
            },
            { children: ['prTitle', 'prLink'], component: 'Column', id: 'prBody' },
            { component: 'Text', id: 'prTitle', text: 'PR #1' },
            {
              component: 'Text',
              id: 'prLink',
              text: 'on [the branch](https://github.com/o/r/tree/b) since `11-20`',
              variant: 'caption',
            },
            { child: 'noteBody', component: 'Card', id: 'note' },
            { component: 'Text', id: 'noteBody', text: 'Plain tile' },
          ],
          surfaceId: 'links',
        },
        version: '1.0',
      },
    ]);
    if (!result.ok) throw new Error(result.errors.join());
    return result.record;
  };

  it('opens a Card with an action from a click or the keyboard, and only that card', async () => {
    const opened = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    render(<SurfaceView record={linked()} />, { wrapper });
    const card = await screen.findByRole('button');
    fireEvent.click(screen.getByText('PR #1'));
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(opened.mock.calls.map(([url]) => url)).toEqual([
      'https://github.com/o/r/pull/1',
      'https://github.com/o/r/pull/1',
    ]);
    // A card without an action stays a plain tile.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    opened.mockRestore();
  });

  it('draws https links in captions, which open on their own and not the card', async () => {
    const opened = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    render(<SurfaceView record={linked()} />, { wrapper });
    const link = await screen.findByRole('link', { name: 'the branch' });
    expect(link.getAttribute('href')).toBe('https://github.com/o/r/tree/b');
    expect(link.getAttribute('target')).toBe('_blank');
    fireEvent.click(link);
    expect(opened).not.toHaveBeenCalled();
    opened.mockRestore();
  });

  it('rejects a Card action that opens a non-https url', () => {
    const result = validateSurface([
      {
        updateComponents: {
          components: [
            { action: open('http://x.com'), child: 't', component: 'Card', id: 'root' },
            { component: 'Text', id: 't', text: 'x' },
          ],
          surfaceId: 'bad',
        },
        version: '1.0',
      },
    ]);
    expect(!result.ok && result.errors).toContain('Card root: openUrl needs an https url');
  });
});

describe('host', () => {
  const form = () => {
    const result = validateSurface([
      {
        updateComponents: {
          components: [
            { children: ['table', 'pick', 'go'], component: 'Column', id: 'root' },
            { columns: [{ key: 'a', label: 'A' }], component: 'DataTable', id: 'table', rows: [] },
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

  it('sends one action when a button is clicked twice before the host answers', async () => {
    let accept: (value: boolean) => void = () => {};
    const sendAction = vi.fn(() => new Promise<boolean>((resolve) => (accept = resolve)));
    render(
      <A2uiHostProvider value={{ canAct: true, sendAction }}>
        <SurfaceList surfaces={[form()]} />
      </A2uiHostProvider>,
      { wrapper },
    );
    const button = await screen.findByText('Approve now');
    fireEvent.click(button);
    fireEvent.click(button);
    await vi.waitFor(() => expect(sendAction).toHaveBeenCalledTimes(1));
    accept(true);
    fireEvent.click(button);
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
