// Offline test for .github/workflows/copilot-triage.yml. It extracts the github-script body and
// runs it against stubs, so nothing here reaches GitHub or Azure. Run it by hand, no install needed:
//   node --test tests/copilotTriage.test.cjs
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const workflow = readFileSync(path.resolve(__dirname, '../.github/workflows/copilot-triage.yml'), 'utf8')
  .replace(/\r\n/g, '\n');
const script = workflow.split('          script: |')[1].split('\n')
  .map(line => line.startsWith('            ') ? line.slice(12) : line).join('\n');

const approval = { decision: 'APPROVED', confidence: 9, summary: 'Synthetic', recommendation: 'Synthetic' };
const reply = (finish, content, extra = {}) => ({
  choices: [{ finish_reason: finish, message: { content, ...extra } }],
});

async function triage({ deployment, response = reply('stop', JSON.stringify(approval)) } = {}) {
  const requests = [];
  const seen = { labels: [], comments: [], closed: [], assigned: [] };
  const issues = {
    listForRepo: async () => ({ data: [] }),
    addLabels: async value => { seen.labels.push(...value.labels); },
    createComment: async value => { seen.comments.push(value.body); },
    update: async value => { seen.closed.push(value.state); },
    addAssignees: async value => { seen.assigned.push(...value.assignees); },
  };
  const env = { AZURE_OPENAI_ENDPOINT: 'https://synthetic.invalid', AZURE_OPENAI_KEY: 'synthetic-key' };
  if (deployment !== undefined) env.TRIAGE_DEPLOYMENT = deployment;
  await new vm.Script(`(async () => {${script}\n})()`).runInNewContext({
    context: { repo: { owner: 'example', repo: 'synthetic' },
      payload: { issue: { number: 1, title: 'Synthetic', body: 'Fixture', labels: [{ name: 'bug' }] } } },
    github: { rest: { issues } },
    process: { env },
    require: name => {
      assert.equal(name, 'fs');
      return { existsSync: () => false };
    },
    console: { log() {} },
    fetch: async (url, options) => {
      requests.push({ url, apiKey: options.headers['api-key'], body: JSON.parse(options.body) });
      return { ok: true, json: async () => response };
    },
  });
  return { requests, ...seen };
}

for (const [state, deployment] of [['unset', undefined], ['empty', '']]) {
  test(`TRIAGE_DEPLOYMENT ${state} calls gpt-6-luna on the unchanged api-version`, async () => {
    const { requests } = await triage({ deployment });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url,
      'https://synthetic.invalid/openai/deployments/gpt-6-luna/chat/completions?api-version=2025-01-01-preview');
    assert.equal(requests[0].apiKey, 'synthetic-key');
  });
}

test('the request carries max_completion_tokens, reasoning none and the existing temperature', async () => {
  const { requests } = await triage({ deployment: 'gpt-6-luna' });
  const { body } = requests[0];
  assert.equal(body.max_completion_tokens, 300);
  assert.equal(body.reasoning_effort, 'none');
  assert.equal(body.temperature, 0.1);
  assert.equal(body.max_tokens, undefined);
  assert.equal(body.messages.length, 1);
  assert.match(body.messages[0].content, /You are a project maintainer triaging a GitHub issue\./);
});

test('the workflow feeds vars.TRIAGE_DEPLOYMENT with a gpt-6-luna default', () => {
  assert.match(workflow, /TRIAGE_DEPLOYMENT: \$\{\{ vars\.TRIAGE_DEPLOYMENT \|\| 'gpt-6-luna' \}\}/);
});

test('the workflow names no model that is retiring', () => {
  assert.doesNotMatch(workflow, /gpt-4o|gpt-4\.1|\bo4-mini\b|\bo3\b/);
});

for (const model of ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini', 'unknown-alias']) {
  test(`${model} is refused as a triage deployment`, async () => {
    await assert.rejects(triage({ deployment: model }), /supported actual model/);
  });
}

const incomplete = {
  'was truncated at the token ceiling': reply('length', JSON.stringify(approval)),
  'was stopped by the content filter': reply('content_filter', JSON.stringify(approval)),
  'carries a refusal': reply('stop', null, { refusal: 'Synthetic refusal' }),
  'has no choices': { choices: [] },
};
for (const [state, response] of Object.entries(incomplete)) {
  test(`a reply that ${state} goes to needs-review with no comment, close or assignment`, async () => {
    const seen = await triage({ deployment: 'gpt-6-luna', response });
    assert.deepEqual(seen.labels, ['needs-review']);
    assert.equal(seen.comments.length, 0);
    assert.equal(seen.closed.length, 0);
    assert.equal(seen.assigned.length, 0);
  });
}

test('a complete gpt-6-luna approval is commented, labelled approved and assigned to Copilot', async () => {
  const seen = await triage({ deployment: 'gpt-6-luna' });
  assert.match(seen.requests[0].url, /deployments\/gpt-6-luna\/chat\/completions/);
  assert.deepEqual(seen.labels, ['approved']);
  assert.equal(seen.comments.length, 1);
  assert.deepEqual(seen.assigned, ['copilot-swe-agent[bot]']);
});
