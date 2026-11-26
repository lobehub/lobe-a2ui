import { describe, expect, it } from 'vitest';

import { buildA2uiSystemPrompt } from './processor';
import { A2UI_CLI_SYSTEM_PROMPT, A2UI_SYSTEM_PROMPT } from './systemPrompt';

describe('generated system prompts', () => {
  it('match what the processor builds; run `bun scripts/prompt.ts` when this fails', () => {
    expect(A2UI_SYSTEM_PROMPT).toBe(buildA2uiSystemPrompt({ delivery: 'tool' }));
    expect(A2UI_CLI_SYSTEM_PROMPT).toBe(buildA2uiSystemPrompt({ delivery: 'cli' }));
  });

  it('word the delivery for each host', () => {
    expect(A2UI_SYSTEM_PROMPT).toContain('renderUI');
    expect(A2UI_CLI_SYSTEM_PROMPT).toContain('lh card render');
    expect(A2UI_CLI_SYSTEM_PROMPT).not.toBe(A2UI_SYSTEM_PROMPT);
  });
});
