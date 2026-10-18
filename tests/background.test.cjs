const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup(options = {}) {
  const calls = { fetch: [], copied: [], notices: [], badges: [], closed: 0 };
  const context = vm.createContext({ URL, URLSearchParams, AbortSignal, Error, TypeError, SyntaxError,
    fetch: async (...args) => {
      calls.fetch.push(args);
      if (options.networkError) throw new TypeError('Network failed');
      return { ok: options.httpOk ?? true, status: options.status ?? 503, json: async () => { if (options.invalidJson) throw new SyntaxError('Invalid JSON'); return options.data ?? { shorturl: 'https://is.gd/abc123' }; } };
    },
    chrome: {
      permissions: { contains: async () => options.hasAccess ?? true },
      tabs: { query: async () => [{ url: 'https://example.com/?x=1&y=2' }] },
      runtime: { getContexts: async () => [], getURL: p => `chrome-extension://test/${p}`,
        sendMessage: async m => { calls.copied.push(m.text); return { ok: options.copyOk ?? true }; } },
      offscreen: { createDocument: async () => {}, closeDocument: async () => { calls.closed++; } },
      notifications: { create: async (_, n) => { calls.notices.push(n); if (options.notificationsFail) throw new Error('Notifications disabled'); } },
      commands: { onCommand: { addListener: fn => { calls.command = fn; } } },
      action: { setBadgeText: async ({ text }) => { calls.badges.push(text); }, setTitle: async () => {}, onClicked: { addListener: fn => { calls.action = fn; } } },
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

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

test('default shortcut invokes the native toolbar action', async () => {
  assert.equal(manifest.commands._execute_action.suggested_key.default, 'Alt+Shift+C');
  const { calls } = setup();
  await calls.action({ url: 'https://example.com/from-shortcut' });
  assert.equal(calls.fetch[0][1].body.get('url'), 'https://example.com/from-shortcut');
  assert.deepEqual(calls.copied, ['https://is.gd/abc123']);
  assert.deepEqual(calls.badges, ['...', '✓']);
});

test('existing custom shortcuts still invoke the copy workflow', async () => {
  const { calls } = setup();
  await calls.command('toggle-pin', { url: 'https://example.com/legacy' });
  assert.equal(calls.fetch[0][1].body.get('url'), 'https://example.com/legacy');
  assert.deepEqual(calls.copied, ['https://is.gd/abc123']);
});

test('legacy command without a supplied tab queries the active tab', async () => {
  const { calls } = setup();
  await calls.command('toggle-pin');
  assert.deepEqual(calls.copied, ['https://is.gd/abc123']);
});

test('unrelated command does not shorten or overwrite clipboard', async () => {
  const { calls } = setup();
  await calls.command('unrelated');
  assert.equal(calls.fetch.length, 0);
  assert.equal(calls.copied.length, 0);
});

test('service failures are visible even without system notifications', async () => {
  const { calls } = setup({ networkError: true, notificationsFail: true });
  await calls.action({ url: 'https://example.com' });
  assert.deepEqual(calls.badges, ['...', '!']);
  assert.equal(calls.copied.length, 0);
});

test('notification failure does not turn a successful copy into an error', async () => {
  const { calls } = setup({ notificationsFail: true });
  await calls.action({ url: 'https://example.com' });
  assert.deepEqual(calls.badges, ['...', '✓']);
  assert.deepEqual(calls.copied, ['https://is.gd/abc123']);
});

for (const [options, message] of [
  [{ hasAccess: false }, /not granted.*is.gd/],
  [{ networkError: true }, /could not connect to is.gd/],
  [{ invalidJson: true }, /responded.*valid shortening response/],
  [{ httpOk: false, status: 429 }, /HTTP 429/],
  [{ copyOk: false }, /shortened.*could not copy/],
]) {
  test(`reports the actual failure stage: ${JSON.stringify(options)}`, async () => {
    const { calls, run } = setup(options);
    await run();
    assert.match(calls.notices[0].message, message);
    if (options.hasAccess === false) assert.equal(calls.fetch.length, 0);
  });
}
