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

async function shortenUrl(url) {
  const hasAccess = await chrome.permissions.contains({ origins: ['https://da.gd/*'] });
  if (!hasAccess) {
    throw new Error('Chrome has not granted Short Copy access to da.gd. Allow da.gd in the extension’s site access settings.');
  }

  let response;
  try {
    response = await fetch('https://da.gd/s', {
      method: 'POST',
      body: new URLSearchParams({ url }),
      headers: { Accept: 'text/plain' },
      credentials: 'omit',
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('da.gd did not respond within 15 seconds. Please try again.');
    }
    throw new Error('Chrome could not connect to da.gd. Please try again later.');
  }

  if (!response.ok) {
    throw new Error(`da.gd returned HTTP ${response.status}. Please try again later.`);
  }
  const shorturl = (await response.text()).trim();
  if (!/^https:\/\/da\.gd\/[A-Za-z0-9_-]+$/.test(shorturl)) {
    throw new Error('da.gd could not create a short link for this URL. Please try again later.');
  }
  return shorturl;
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
    const shorturl = await shortenUrl(url.href);
    try {
      await copyToClipboard(shorturl);
    } catch {
      throw new Error('The link was shortened, but Chrome could not copy it. Reload Short Copy and try again.');
    }
    await setStatus('✓', 'Short link copied. Click to shorten and copy again.');
    await notify('Copied!', `${shorturl} has been copied to your clipboard.`).catch(() => {});
  } catch (error) {
    const message = error.message || 'Short Copy could not complete this request.';
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
