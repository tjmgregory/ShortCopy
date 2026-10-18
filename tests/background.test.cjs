const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup(options = {}) {
  const calls = { fetch: [], copied: [], notices: [], closed: 0 };
  const context = vm.createContext({ URL, URLSearchParams, AbortSignal, Error, TypeError, SyntaxError,
    fetch: async (...args) => {
      calls.fetch.push(args);
      if (options.networkError) throw new TypeError('Network failed');
      return { ok: options.httpOk ?? true, json: async () => options.data ?? { shorturl: 'https://is.gd/abc123' } };
    },
    chrome: {
      tabs: { query: async () => [{ url: 'https://example.com/?x=1&y=2' }] },
      runtime: { getContexts: async () => [], getURL: p => `chrome-extension://test/${p}`,
        sendMessage: async m => { calls.copied.push(m.text); return { ok: options.copyOk ?? true }; } },
      offscreen: { createDocument: async () => {}, closeDocument: async () => { calls.closed++; } },
      notifications: { create: async (_, n) => { calls.notices.push(n); } },
      commands: { onCommand: { addListener: fn => { calls.command = fn; } } },
      action: { onClicked: { addListener: fn => { calls.action = fn; } } },
    },
  });
  vm.runInContext(fs.readFileSync('background.js', 'utf8'), context);
  return { calls, run: tab => context.shortenAndCopy(tab) };
}

test('shortens the exact URL and only reports success after copying', async () => {
  const { calls, run } = setup();
  await run();
  assert.equal(calls.fetch[0][1].body.get('url'), 'https://example.com/?x=1&y=2');
  assert.equal(calls.fetch[0][1].credentials, 'omit');
  assert.deepEqual(calls.copied, ['https://is.gd/abc123']);
  assert.equal(calls.notices[0].title, 'Copied!');
  assert.equal(calls.closed, 1);
});
for (const url of ['chrome://extensions', 'file:///tmp/private', 'javascript:alert(1)', 'https://user:password@example.com', 'not a url']) {
  test(`does not send unsupported URL ${url}`, async () => {
    const { calls, run } = setup(); await run({ url });
    assert.equal(calls.fetch.length, 0); assert.equal(calls.copied.length, 0);
    assert.match(calls.notices[0].title, /could not/);
  });
}
for (const options of [{ httpOk: false }, { networkError: true }, { data: { errorcode: 1 } }, { data: {} }, { data: { shorturl: 'https://evil.example/a' } }]) {
  test(`does not overwrite clipboard on service failure ${JSON.stringify(options)}`, async () => {
    const { calls, run } = setup(options); await run();
    assert.equal(calls.copied.length, 0); assert.match(calls.notices[0].title, /could not/);
  });
}
test('clipboard failure closes the document and reports failure', async () => {
  const { calls, run } = setup({ copyOk: false }); await run();
  assert.equal(calls.closed, 1); assert.match(calls.notices[0].title, /could not/);
});
test('overlapping invocations do not race clipboard writes', async () => {
  const { calls, run } = setup(); await Promise.all([run(), run()]);
  assert.equal(calls.fetch.length, 1); assert.equal(calls.copied.length, 1);
  await run(); assert.equal(calls.fetch.length, 2);
});
