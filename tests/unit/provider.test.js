// How Sales Lab talks to the AI service: headers and the errors a manager sees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anthropicHeaders, createProvider, mapHttpError, RUN_ERROR_MESSAGES } from '../../server/ai/provider.js';
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

// ---------------------------------------------------------------- Anthropic coaching request

const TOOL = { name: 'record_evaluation', description: 'Record it.', input_schema: { type: 'object', properties: {} } };
const REQUEST = { system: 'sys', user: 'evaluate this', tool: TOOL };
const anthropic = () =>
  createProvider(loadConfig({ ANTHROPIC_API_KEY: 'k', AI_MODEL: 'claude-test' }));

// Replays canned Anthropic responses and records each request body.
function stubFetch(t, responses) {
  const bodies = [];
  const queue = [...responses];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    const next = queue.shift();
    return new Response(JSON.stringify(next), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return bodies;
}
const toolReply = (input) => ({
  model: 'claude-test',
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: 'tu_1', name: TOOL.name, input }],
  usage: { input_tokens: 100, output_tokens: 50 },
});
const textReply = (text) => ({
  model: 'claude-test',
  stop_reason: 'end_turn',
  content: [{ type: 'text', text }],
  usage: { input_tokens: 100, output_tokens: 10 },
});

test('coaching lets the model choose the tool instead of forcing it', async (t) => {
  const bodies = stubFetch(t, [toolReply({ summary: 'ok' })]);
  const out = await anthropic().evaluate(REQUEST, { timeoutMs: 30_000 });
  assert.deepEqual(out.output, { summary: 'ok' });
  assert.equal(bodies.length, 1);
  assert.deepEqual(bodies[0].tool_choice, { type: 'auto' });
  assert.equal(bodies[0].tools[0].name, TOOL.name);
});

test('a plain-text reply gets one reminder to use the tool', async (t) => {
  const bodies = stubFetch(t, [textReply('Here is my evaluation...'), toolReply({ summary: 'second try' })]);
  const out = await anthropic().evaluate(REQUEST, { timeoutMs: 30_000 });
  assert.deepEqual(out.output, { summary: 'second try' });
  assert.equal(bodies.length, 2);
  const msgs = bodies[1].messages;
  assert.equal(msgs.length, 3);
  assert.equal(msgs[1].role, 'assistant');
  assert.equal(msgs[2].role, 'user');
  assert.match(msgs[2].content, /record_evaluation/);
  assert.equal(out.usage.input_tokens, 200);
  assert.equal(out.usage.output_tokens, 60);
});

test('two plain-text replies count as an incomplete response', async (t) => {
  const bodies = stubFetch(t, [textReply('no'), textReply('still no')]);
  await assert.rejects(anthropic().evaluate(REQUEST, { timeoutMs: 30_000 }), (err) => err.code === 'invalid_response');
  assert.equal(bodies.length, 2);
});

test('no reminder is sent when too little time is left', async (t) => {
  const bodies = stubFetch(t, [textReply('no')]);
  await assert.rejects(anthropic().evaluate(REQUEST, { timeoutMs: 5_000 }), (err) => err.code === 'invalid_response');
  assert.equal(bodies.length, 1);
});

test('a refusal is reported without a reminder', async (t) => {
  const bodies = stubFetch(t, [{ model: 'claude-test', stop_reason: 'refusal', content: [] }]);
  await assert.rejects(anthropic().evaluate(REQUEST, { timeoutMs: 30_000 }), (err) => err.code === 'refusal');
  assert.equal(bodies.length, 1);
});
