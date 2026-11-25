/**
 * @vitest-environment happy-dom
 */
import { ConfigProvider } from '@lobehub/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateSurface } from '../validate';
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
    const strip = document.querySelector<HTMLElement>('[style*="--a2ui-metric-columns"]');
    expect(strip?.style.getPropertyValue('--a2ui-metric-columns')).toBe('1');

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
