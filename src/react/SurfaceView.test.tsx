/**
 * @vitest-environment happy-dom
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConfigProvider } from '@lobehub/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { A2UI_PROMPT_EXAMPLES } from '../prompt';
import { validateSurface } from '../validate';
import { A2uiIcon } from './components';
import { SurfaceView } from './SurfaceView';

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
          { badge: 'tag', child: 'col', component: 'Card', id: 'root', title: 'Offsite' },
          { component: 'Tag', id: 'tag', text: 'Best match' },
          { children: ['metrics', 'go'], component: 'Column', id: 'col' },
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
      expect(onAction).toHaveBeenCalledWith({
        context: { people: 18 },
        name: 'book',
        surfaceId: 'plan',
      }),
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
  const dir = join(__dirname, '../../test/fixtures/official-examples');
  const examples = readdirSync(dir).map(
    (file) => [file, JSON.parse(readFileSync(join(dir, file), 'utf8')).messages] as const,
  );

  it.each(examples)('draws the official example %s', async (_, messages) => {
    const result = validateSurface(messages);
    if (!result.ok) throw new Error(result.errors.join());
    const { container } = render(<SurfaceView record={result.record} />, { wrapper });
    // Replayed, not the text fallback.
    await vi.waitFor(() => expect(container.querySelector('.lobe-dashboard-surface')).toBeTruthy());
    expect(container.textContent?.length).toBeGreaterThan(0);
  });

  it.each(A2UI_PROMPT_EXAMPLES.map((example) => [example.name, example.messages] as const))(
    'draws the prompt example %s',
    async (name, messages) => {
      const result = validateSurface(messages);
      if (!result.ok) throw new Error(result.errors.join());
      render(<SurfaceView record={result.record} />, { wrapper });
      if (name === 'Plan Comparison') {
        expect(await screen.findByText('Pro is the better fit for 14 seats')).toBeTruthy();
        expect(screen.getByText('$19')).toBeTruthy();
      }
      if (name === 'Trip Day') {
        expect(await screen.findByText('teamLab Planets')).toBeTruthy();
        expect(screen.getByText('Hotel')).toBeTruthy();
      }
    },
  );

  it('lazy-loads icons from each set', async () => {
    const { container } = render(
      <>
        <A2uiIcon name="home" />
        <A2uiIcon name="trending-up" set="lucide" />
        <A2uiIcon name="github" set="simple" />
        <A2uiIcon name="openai" set="lobehub" />
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
