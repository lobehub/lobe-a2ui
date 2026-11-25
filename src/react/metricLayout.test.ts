import { describe, expect, it } from 'vitest';

import { METRIC_MIN_CELL_WIDTH, metricColumns } from './metricLayout';

describe('metricColumns', () => {
  it('keeps every metric on one row while each cell stays readable', () => {
    expect(metricColumns(4, 640)).toBe(4);
    expect(metricColumns(5, 5 * METRIC_MIN_CELL_WIDTH)).toBe(5);
  });

  it('takes one row before the strip has been measured', () => {
    expect(metricColumns(4, undefined)).toBe(4);
    expect(metricColumns(4, 0)).toBe(4);
  });

  it('wraps into balanced rows once cells would be cut', () => {
    expect(metricColumns(4, 400)).toBe(2); // 2 × 2, not 3 + 1
    expect(metricColumns(5, 400)).toBe(3); // 3 + 2
    expect(metricColumns(6, 400)).toBe(3); // 3 + 3
    expect(metricColumns(3, 300)).toBe(2); // 2 + 1
  });

  it('falls back to one column when even two do not fit', () => {
    expect(metricColumns(4, 200)).toBe(1);
    expect(metricColumns(1, 50)).toBe(1);
  });
});
