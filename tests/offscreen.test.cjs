const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup(copyWorks = true) {
  let listener;
  const calls = [];
  const field = { value: '', select() { calls.push(['select', this.value]); } };
  vm.runInNewContext(fs.readFileSync('offscreen.js', 'utf8'), {
    chrome: { runtime: { id: 'test', onMessage: { addListener(fn) { listener = fn; } } } },
    document: { getElementById: () => field, execCommand(cmd) { calls.push([cmd, field.value]); return copyWorks; } },
  });
  return { field, calls, send: (message, sender = { id: 'test' }) => {
    let response; listener(message, sender, r => { response = r; }); return response;
  } };
}
test('copies text then clears temporary DOM content', () => {
  const h = setup(); const result = h.send({ target: 'clipboard', text: 'https://is.gd/abc123' });
  assert.equal(result.ok, true); assert.equal(h.field.value, '');
  assert.deepEqual(h.calls, [['select', 'https://is.gd/abc123'], ['copy', 'https://is.gd/abc123']]);
});
test('reports clipboard API failure', () => {
  const h = setup(false); assert.equal(h.send({ target: 'clipboard', text: 'x' }).ok, false);
});
test('ignores foreign and unrelated messages', () => {
  const h = setup();
  assert.equal(h.send({ target: 'clipboard', text: 'x' }, { id: 'other' }), undefined);
  assert.equal(h.send({ target: 'other', text: 'x' }), undefined); assert.equal(h.calls.length, 0);
});
test('rejects malformed text without changing the clipboard', () => {
  const h = setup(); assert.equal(h.send({ target: 'clipboard', text: null }).ok, false);
  assert.equal(h.calls.length, 0);
});
