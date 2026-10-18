// How Sales Lab talks to the AI service: headers and the errors a manager sees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anthropicHeaders, mapHttpError, RUN_ERROR_MESSAGES } from '../../server/ai/provider.js';
import { loadConfig } from '../../server/config.js';

test('a workspace is sent only when one is configured', () => {
  const plain = anthropicHeaders({ anthropicKey: 'k', anthropicWorkspaceId: '' });
  assert.equal(plain['x-api-key'], 'k');
  assert.equal('anthropic-workspace-id' in plain, false);
  const scoped = anthropicHeaders({ anthropicKey: 'k', anthropicWorkspaceId: 'wrkspc_123' });
  assert.equal(scoped['anthropic-workspace-id'], 'wrkspc_123');
});

test('ANTHROPIC_WORKSPACE_ID is read and trimmed', () => {
  const config = loadConfig({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_WORKSPACE_ID: '  wrkspc_abc  ' });
  assert.equal(config.ai.anthropicWorkspaceId, 'wrkspc_abc');
  assert.equal(loadConfig({ ANTHROPIC_API_KEY: 'k' }).ai.anthropicWorkspaceId, '');
});

test('a key that needs a workspace gets its own plain explanation', () => {
  const err = mapHttpError(400, {
    error: {
      type: 'invalid_request_error',
      message:
        'This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header with the ID of the workspace to use. Add the header, or use an API key that is scoped to a workspace.',
    },
  });
  assert.equal(err.code, 'key_needs_workspace');
  assert.equal(err.message, RUN_ERROR_MESSAGES.key_needs_workspace);
  assert.match(err.message, /answer is saved/);
  assert.equal(mapHttpError(400, { error: { message: 'max_tokens is too large' } }).code, 'bad_request');
  assert.equal(mapHttpError(401, { error: { message: 'invalid x-api-key' } }).code, 'auth_error');
});
