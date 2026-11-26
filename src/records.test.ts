import { describe, expect, it } from 'vitest';

import {
  A2UI_TOOL_IDENTIFIER,
  isA2uiToolResult,
  surfacesFromToolResults,
  surfacesToText,
  toSurfaceRecords,
} from './records';

const surface = {
  catalogId: 'c',
  fallback: 'Plan',
  operations: [],
  surfaceId: 's',
  version: '1.0',
};

describe('stored surfaces', () => {
  it('keeps only well-formed records', () => {
    expect(toSurfaceRecords([surface, { surfaceId: 1 }, null, 'x'])).toEqual([surface]);
    expect(toSurfaceRecords(undefined)).toEqual([]);
  });

  it('finds the surfaces card tool calls drew, in order', () => {
    const tools = [
      { identifier: 'web-search', result: { state: {} } },
      { apiName: 'renderUI', identifier: A2UI_TOOL_IDENTIFIER, result: { state: { surface } } },
      { identifier: A2UI_TOOL_IDENTIFIER, result: { state: {} } },
      { identifier: A2UI_TOOL_IDENTIFIER, result: null },
    ];
    expect(tools.map(isA2uiToolResult)).toEqual([false, true, false, false]);
    expect(surfacesFromToolResults(tools)).toEqual([surface]);
    expect(surfacesFromToolResults(undefined)).toEqual([]);
  });

  it('turns surfaces into text lines', () => {
    expect(surfacesToText([surface, { ...surface, fallback: '', title: 'T' }])).toBe(
      '[Card] Plan\n[Card] T',
    );
  });
});
