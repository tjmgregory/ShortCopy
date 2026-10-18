let busy = false;

async function setStatus(text, title) {
  await Promise.all([
    chrome.action.setBadgeText({ text }),
    chrome.action.setTitle({ title }),
  ]).catch(() => {});
}

async function notify(title, message) {
  await chrome.notifications.create('short-copy', {
    type: 'basic', iconUrl: '48.png', title, message,
  });
}

async function copyToClipboard(text) {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')],
  });
  if (!contexts.length) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html', reasons: ['CLIPBOARD'],
      justification: 'Copy the shortened URL after the user invokes Short Copy.',
    });
  }
  try {
    const result = await chrome.runtime.sendMessage({ target: 'clipboard', text });
    if (!result?.ok) throw new Error('Could not copy the link. Please try again.');
  } finally {
    await chrome.offscreen.closeDocument().catch(() => {});
  }
}

async function shortenAndCopy(tab) {
  if (busy) return;
  busy = true;
  await setStatus('...', 'Shortening this URL…');
  try {
    if (!tab?.url) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let url;
    try { url = new URL(tab?.url); } catch {
      throw new Error('Open a web page before using Short Copy.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Short Copy supports HTTP and HTTPS links without embedded passwords.');
    }
    const response = await fetch('https://is.gd/create.php', {
      method: 'POST',
      body: new URLSearchParams({ format: 'json', url: url.href }),
      credentials: 'omit',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('The shortening service is unavailable. Please try again later.');
    const data = await response.json();
    if (data.errorcode || typeof data.shorturl !== 'string' || !/^https:\/\/is\.gd\/[A-Za-z0-9_]+$/.test(data.shorturl)) {
      throw new Error('The shortening service could not shorten this link. Please try another URL or try again later.');
    }
    await copyToClipboard(data.shorturl);
    await setStatus('✓', 'Short link copied. Click to shorten and copy again.');
    await notify('Copied!', `${data.shorturl} has been copied to your clipboard.`).catch(() => {});
  } catch (error) {
    const message = error.name === 'TimeoutError' || error instanceof TypeError || error instanceof SyntaxError
      ? 'Could not reach the shortening service. Please try again later.'
      : error.message;
    await setStatus('!', message);
    await notify('Short Copy could not copy this link', message).catch(() => {});
  } finally {
    busy = false;
  }
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-pin') return shortenAndCopy(tab);
});
chrome.action.onClicked.addListener(shortenAndCopy);
