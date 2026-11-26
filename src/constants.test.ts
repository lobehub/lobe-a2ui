import { describe, expect, it } from 'vitest';

import { LOBEHUB_CATALOG_DOCUMENT } from './catalog';
import { A2UI_CATALOG_ID } from './constants';

describe('renderer constants', () => {
  it('name the LobeHub catalog document', () => {
    expect(A2UI_CATALOG_ID).toBe(LOBEHUB_CATALOG_DOCUMENT.catalogId);
  });
});
