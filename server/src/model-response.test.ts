import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelResponse } from './model-response.js';
import { chatMeals, extractWithImage } from './llm.js';
import { extractFromText } from './extract.js';

test('retries temporary provider failures but not invalid credentials', async (t) => {
  const oldKey = process.env.LLM_API_KEY;
  process.env.LLM_API_KEY = 'test-key';
  t.after(() => { if (oldKey === undefined) delete process.env.LLM_API_KEY; else process.env.LLM_API_KEY = oldKey; });
  let calls = 0;
  let denied = false;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    if (denied) return new Response('{}', { status: 401 });
    if (calls === 1) return new Response('{}', { status: 500 });
    if (calls === 2) return new Response(JSON.stringify({ code: 500, msg: 'Server exception, please try again later' }));
    return new Response(JSON.stringify({ output_text: JSON.stringify({ reply: 'Try chickpea salad.', suggestions: [] }) }));
  });
  assert.equal((await chatMeals([{ role: 'user', content: 'Quick dinner' }])).reply, 'Try chickpea salad.');
  assert.equal(calls, 3);
  denied = true;
  await assert.rejects(chatMeals([{ role: 'user', content: 'Quick dinner' }]), /HTTP 401/);
  assert.equal(calls, 4);
});

test('reads completed SSE response instead of empty initial response', () => {
  const response = { output: [{ content: [{ type: 'output_text', text: '{"title":"Rice"}' }] }] };
  const stream = [
    { type: 'response.created', response: { output: [] } },
    { type: 'response.completed', response },
  ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  assert.deepEqual(parseModelResponse(stream), response);
});

test('assembles text deltas and preserves upstream errors', () => {
  assert.deepEqual(parseModelResponse('data: {"type":"response.output_text.delta","delta":"hello"}\n\ndata: [DONE]\n\n'), { output_text: 'hello' });
  assert.deepEqual(parseModelResponse('data: {"type":"response.failed","response":{"error":{"message":"Denied"}}}\n\n'), { error: { message: 'Denied' } });
  assert.equal(parseModelResponse('<html>Bad gateway</html>'), null);
});

test('short ingredients, photo inputs and chat context reach the model', async (t) => {
  const old = { ...process.env };
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_PROTOCOL = 'responses';
  t.after(() => {
    for (const name of ['LLM_API_KEY', 'LLM_PROTOCOL']) {
      if (old[name] === undefined) delete process.env[name];
      else process.env[name] = old[name];
    }
  });
  const requests: any[] = [];
  const recipe = { title: 'Egg Rice', inferred: true, ingredients: [{ qty: '2', unit: '', name: 'eggs' }], instructions: ['Cook the eggs and rice.'] };
  let reply: unknown = recipe;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ output_text: JSON.stringify(reply) }));
  });
  assert.equal((await extractFromText('eggs, rice')).title, 'Egg Rice');
  assert.match(JSON.stringify(requests[0]), /just ingredients/);
  await extractWithImage('data:image/jpeg;base64,dGVzdA==');
  assert.equal(requests[1].input[1].content[1].type, 'input_image');
  assert.match(JSON.stringify(requests[1]), /restaurant menu/i);
  reply = { reply: 'Try a tomato rice bowl.', suggestions: [{ title: 'Tomato Rice', description: 'Dairy-free and quick.' }] };
  const result = await chatMeals([
    { role: 'user', content: 'No dairy please' },
    { role: 'assistant', content: 'Would you like rice?' },
    { role: 'user', content: 'Yes, with tomatoes' },
  ]);
  assert.equal(result.suggestions[0].title, 'Tomato Rice');
  assert.match(JSON.stringify(requests[2]), /No dairy please/);
  assert.match(JSON.stringify(requests[2]), /Yes, with tomatoes/);
});
