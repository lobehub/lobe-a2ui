/**
 * @vitest-environment happy-dom
 */
import { ConfigProvider } from '@lobehub/ui';
import { cleanup, render } from '@testing-library/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hasLegacyComponents, upgradeLegacyOperations } from '../legacy';
import { validateSurface } from '../validate';
import { A2uiHostProvider } from './host';
import { SurfaceView } from './SurfaceView';

afterEach(cleanup);

const wrapper = ({ children }: { children: ReactNode }) => (
  <ConfigProvider motion={motion}>{children}</ConfigProvider>
);

/** A card as the 1.0 catalog stored it: a titled Card, Items and Bars. */
const legacy = {
  catalogId: 'https://lobehub.com/a2ui/catalog/v1',
  fallback: 'DC daily check · 5xx 0',
  operations: [
    {
      createSurface: { catalogId: 'https://lobehub.com/a2ui/catalog/v1', surfaceId: 'dc' },
      version: '1.0',
    },
    {
      updateComponents: {
        components: [
          {
            badge: 'b',
            child: 'col',
            component: 'Card',
            description: 'Overnight',
            id: 'root',
            title: 'DC daily check',
          },
          { color: 'warning', component: 'Tag', id: 'b', text: 'Watch' },
          { children: ['m', 'i', 'bars'], component: 'Column', id: 'col' },
          {
            component: 'Metrics',
            id: 'm',
            items: [
              { label: '5xx', tone: 'good', value: '0' },
              { delta: '+57%', label: '4xx', tone: 'bad', value: '667' },
            ],
          },
          {
            component: 'Items',
            id: 'i',
            items: [{ detail: 'since 02:00', status: 'worse', title: '4xx up' }],
            title: 'Follow-ups',
          },
          {
            component: 'Bars',
            id: 'bars',
            labels: ['00', '01'],
            title: 'P95',
            unit: 's',
            values: [0.8, 1.2],
          },
        ],
        surfaceId: 'dc',
      },
      version: '1.0',
    },
  ],
  surfaceId: 'dc',
  title: 'DC daily check',
  version: '1.0',
};

describe('cards stored before 1.1', () => {
  it('upgrade into components today’s catalog accepts', () => {
    expect(hasLegacyComponents(legacy.operations)).toBe(true);
    const upgraded = upgradeLegacyOperations(legacy.operations);
    expect(hasLegacyComponents(upgraded)).toBe(false);
    // Upgrades replay stored cards, so they may use the retired 1.x components.
    const result = validateSurface(upgraded, { allowDeprecated: true });
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('still draw as cards, with their title, badge, items and figures', async () => {
    const { container } = render(
      <A2uiHostProvider value={{ canAct: false, locale: 'zh-CN', sendAction: vi.fn() }}>
        <SurfaceView record={legacy} />
      </A2uiHostProvider>,
      { wrapper },
    );
    await vi.waitFor(() => expect(container.textContent).toContain('4xx up'));
    const text = container.textContent ?? '';
    for (const part of [
      'DC daily check',
      'Overnight',
      'Watch',
      '667',
      'Follow-ups',
      '恶化',
      'since 02:00',
    ])
      expect(text).toContain(part);
  });

  it('leave today’s cards untouched', () => {
    const current = [
      {
        updateComponents: {
          components: [{ component: 'Text', id: 'root', text: 'Hi' }],
          surfaceId: 's',
        },
        version: '1.0',
      },
    ];
    expect(upgradeLegacyOperations(current)).toBe(current);
  });
});
