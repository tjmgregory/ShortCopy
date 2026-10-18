let busy = false;

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
    await notify('Copied!', `${data.shorturl} has been copied to your clipboard.`);
  } catch (error) {
    const message = error.name === 'TimeoutError' || error instanceof TypeError || error instanceof SyntaxError
      ? 'Could not reach the shortening service. Please try again later.'
      : error.message;
    await notify('Short Copy could not copy this link', message).catch(() => {});
  } finally {
    busy = false;
  }
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-pin') void shortenAndCopy(tab);
});
chrome.action.onClicked.addListener((tab) => { void shortenAndCopy(tab); });
