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
  const hasAccess = await chrome.permissions.contains({ origins: ['https://is.gd/*'] });
  if (!hasAccess) {
    throw new Error('Chrome has not granted Short Copy access to is.gd. Allow is.gd in the extension’s site access settings.');
  }

  let response;
  try {
    response = await fetch('https://is.gd/create.php', {
      method: 'POST',
      body: new URLSearchParams({ format: 'json', url }),
      credentials: 'omit',
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('is.gd did not respond within 15 seconds. Please try again.');
    }
    throw new Error('Chrome could not connect to is.gd. Check your connection and whether a VPN or blocker is blocking is.gd.');
  }

  if (!response.ok) {
    throw new Error(`is.gd returned HTTP ${response.status}. Please try again later.`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error('is.gd responded, but did not return a valid shortening response. Please try again later.');
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
    const data = await shortenUrl(url.href);
    if (data.errorcode || typeof data.shorturl !== 'string' || !/^https:\/\/is\.gd\/[A-Za-z0-9_]+$/.test(data.shorturl)) {
      throw new Error('The shortening service could not shorten this link. Please try another URL or try again later.');
    }
    try {
      await copyToClipboard(data.shorturl);
    } catch {
      throw new Error('The link was shortened, but Chrome could not copy it. Reload Short Copy and try again.');
    }
    await setStatus('✓', 'Short link copied. Click to shorten and copy again.');
    await notify('Copied!', `${data.shorturl} has been copied to your clipboard.`).catch(() => {});
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
