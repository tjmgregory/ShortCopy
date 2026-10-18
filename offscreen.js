chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message.target !== 'clipboard') return;
  const field = document.getElementById('clipboard');
  try {
    if (typeof message.text !== 'string') throw new Error('Invalid clipboard text');
    field.value = message.text;
    field.select();
    respond({ ok: document.execCommand('copy') });
  } catch {
    respond({ ok: false });
  } finally {
    field.value = '';
  }
});
