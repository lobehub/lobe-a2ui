import { describe, expect, it } from 'vitest';

import { buildA2uiSystemPrompt, getA2uiSystemPrompt } from './prompt';
import { A2UI_TOOL_NAME, A2UI_TOOL_PARAMETERS, runA2uiTool } from './tool';

describe('runA2uiTool', () => {
  it('stores a valid card and tells the model what it drew', () => {
    const result = runA2uiTool({
      operations: [
        {
          updateComponents: {
            components: [
              { child: 'body', component: 'Card', id: 'root', title: 'Offsite plan' },
              { component: 'Text', id: 'body', text: 'Hike and a camp dinner' },
            ],
            surfaceId: 'plan',
          },
          version: '1.0',
        },
      ],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.surface).toMatchObject({ surfaceId: 'plan', title: 'Offsite plan' });
    expect(result.content).toContain('Offsite plan · Hike and a camp dinner');
  });

  it('returns the errors to fix for an invalid card', () => {
    const result = runA2uiTool({
      operations: [
        {
          updateComponents: { components: [{ component: 'Map', id: 'root' }], surfaceId: 's' },
          version: '1.0',
        },
      ],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe('InvalidSurface');
    expect(result.content).toMatch(/Unknown component "Map"/);
    expect(result.content).toContain(`call ${A2UI_TOOL_NAME} again`);
    expect(runA2uiTool(undefined).success).toBe(false);
  });

  it('describes its parameters as JSON Schema', () => {
    expect(A2UI_TOOL_PARAMETERS.required).toEqual(['operations']);
  });
});

describe('system prompt', () => {
  it('holds the product rules and the generated A2UI prompt in one block', () => {
    const prompt = getA2uiSystemPrompt();
    expect(prompt.startsWith('<a2ui_guide>')).toBe(true);
    expect(prompt.endsWith('</a2ui_guide>')).toBe(true);
    expect(prompt).toContain('A display card needs no buttons');
    expect(prompt).toContain('call renderUI with A2UI 1.0 messages');
    expect(prompt).toContain('---BEGIN A2UI JSON SCHEMA---');
    expect(getA2uiSystemPrompt()).toBe(prompt);
  });

  it('words delivery for a command instead of a tool', () => {
    const prompt = buildA2uiSystemPrompt({ delivery: { command: 'lh card render' } });
    expect(prompt).toContain('run `lh card render` with A2UI 1.0 messages');
    expect(prompt).toContain('a JSON array passed to `lh card render`');
    expect(prompt).not.toContain('renderUI');
  });
});
